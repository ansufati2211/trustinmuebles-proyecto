# --- Etapa 1: compilación con el wrapper de Maven ---
FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B -q dependency:go-offline
COPY src/ src/
RUN ./mvnw -B -q package -DskipTests && cp target/*.jar app.jar

# --- Etapa 2: imagen de ejecución ---
FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --uid 1001 trustin && mkdir -p /app/data/h2 /app/data/uploads && chown -R trustin /app
COPY --from=build /src/app.jar app.jar
USER trustin

# Dentro del contenedor hay que escuchar en todas las interfaces (no solo 127.0.0.1).
ENV SERVER_ADDRESS=0.0.0.0 \
    APP_STORAGE_PATH=/app/data/uploads \
    SPRING_DATASOURCE_URL="jdbc:h2:file:/app/data/h2/trustinmuebles;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;AUTO_SERVER=FALSE" \
    JAVA_OPTS="-XX:MaxRAMPercentage=75"

VOLUME /app/data
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -fs http://localhost:8080/actuator/health || exit 1
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
