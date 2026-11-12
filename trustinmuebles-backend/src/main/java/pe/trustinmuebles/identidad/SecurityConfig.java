package pe.trustinmuebles.identidad;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
class SecurityConfig {

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    SecretKey jwtKey(@Value("${app.jwt.secret}") String secret) {
        return new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    @Bean
    JwtEncoder jwtEncoder(SecretKey jwtKey) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(jwtKey));
    }

    @Bean
    JwtDecoder jwtDecoder(SecretKey jwtKey) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(jwtKey).macAlgorithm(MacAlgorithm.HS256).build();
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer("trustinmuebles"));
        return decoder;
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(@Value("${app.cors.allowed-origins}") String origenes) {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowedOrigins(Arrays.stream(origenes.split(",")).map(String::trim).toList());
        cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(List.of("*"));
        UrlBasedCorsConfigurationSource src = new UrlBasedCorsConfigurationSource();
        src.registerCorsConfiguration("/api/**", cfg);
        return src;
    }

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        JwtGrantedAuthoritiesConverter authorities = new JwtGrantedAuthoritiesConverter();
        authorities.setAuthoritiesClaimName("rol");
        authorities.setAuthorityPrefix("ROLE_");
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(authorities);

        http.csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(a -> a
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/error").permitAll()
                        .requestMatchers("/api/v1/auth/login").permitAll()
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html", "/actuator/health").permitAll()
                        // v1.0: portal público de solo lectura. Escribir ahí sin sesión da 401 (regla final).
                        .requestMatchers(HttpMethod.GET, "/api/v1/publico", "/api/v1/publico/**").permitAll()
                        // v1.0 (etapa 4): la única escritura pública es el interés con cita opcional (consentimiento
                        // obligatorio, campo trampa y límite por IP en el servicio).
                        .requestMatchers(HttpMethod.POST, "/api/v1/publico/interes").permitAll()
                        // Etapa 4: bandeja de interesados, notas y agenda de citas, del asesor y del gestor.
                        .requestMatchers("/api/v1/interesados", "/api/v1/interesados/**", "/api/v1/citas/**")
                        .hasAnyRole("GESTOR", "ASESOR")
                        // Inspección técnica: cualquier usuario con sesión la solicita; solo el especialista emite el informe.
                        .requestMatchers(HttpMethod.POST, "/api/v1/casos/*/inspeccion/solicitud").hasRole("COMPRADOR")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/casos/*/inspeccion").hasRole("ESPECIALISTA")
                        // v0.7: el propietario solo otorga o retira su autorización (I13); el gestor publica o retira.
                        // v1.0: en un caso de la inmobiliaria la registra el asesor o el gestor; el servicio decide.
                        .requestMatchers("/api/v1/casos/*/autorizacion").hasAnyRole("PROPIETARIO", "GESTOR", "ASESOR")
                        .requestMatchers("/api/v1/casos/*/publicacion").hasAnyRole("GESTOR", "ASESOR")
                        // F3: asignación de inspecciones, contactos y panel de cartera.
                        .requestMatchers(HttpMethod.PUT, "/api/v1/casos/*/inspeccion/asignacion").hasAnyRole("GESTOR", "ASESOR")
                        .requestMatchers(HttpMethod.POST, "/api/v1/casos/*/contactos").hasRole("COMPRADOR")
                        .requestMatchers("/api/v1/contactos", "/api/v1/contactos/**").hasAnyRole("GESTOR", "ASESOR")
                        .requestMatchers("/api/v1/cartera/**").hasAnyRole("GESTOR", "ASESOR")
                        // v0.8 (I15): decisión de captación, interna de la inmobiliaria.
                        .requestMatchers(HttpMethod.POST, "/api/v1/casos/*/decision-captacion").hasAnyRole("GESTOR", "ASESOR")
                        .requestMatchers(HttpMethod.GET, "/api/v1/casos/*/decisiones-captacion")
                        .hasAnyRole("GESTOR", "REVISOR", "ASESOR")
                        // v1.0 (etapa 3a): proyectos. Leer, el equipo; publicar o cambiar un lote, el gestor y el asesor.
                        // Etapa 3b: la plantilla del CSV es de quien carga lotes (gestor y asesor), no del revisor.
                        .requestMatchers(HttpMethod.GET, "/api/v1/proyectos/*/lotes/plantilla.csv")
                        .hasAnyRole("GESTOR", "ASESOR")
                        .requestMatchers(HttpMethod.GET, "/api/v1/proyectos", "/api/v1/proyectos/**")
                        .hasAnyRole("REVISOR", "GESTOR", "ASESOR")
                        .requestMatchers("/api/v1/proyectos", "/api/v1/proyectos/**").hasAnyRole("GESTOR", "ASESOR")
                        // Historial de evaluaciones: solo lectura y nunca para el comprador.
                        .requestMatchers(HttpMethod.GET, "/api/v1/casos/*/historial")
                                .hasAnyRole("REVISOR", "GESTOR", "ESPECIALISTA", "PROPIETARIO", "ASESOR")
                        // PA4: solo el revisor modifica. El rol se verifica aquí, en el servidor, no solo en la interfaz.
                        .requestMatchers(HttpMethod.PUT, "/api/v1/casos/**").hasAnyRole("REVISOR", "ASESOR")
                        .requestMatchers(HttpMethod.POST, "/api/v1/casos/**").hasAnyRole("REVISOR", "ASESOR")
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/casos/**").hasAnyRole("REVISOR", "ASESOR")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/casos/**").hasAnyRole("REVISOR", "ASESOR")
                        .anyRequest().authenticated())
                .oauth2ResourceServer(o -> o.jwt(j -> j.jwtAuthenticationConverter(converter)))
                .exceptionHandling(e -> e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)));
        return http.build();
    }
}
