package pe.trustinmuebles.almacenamiento;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import pe.trustinmuebles.shared.Hashing;
import pe.trustinmuebles.shared.NoEncontradoException;
import pe.trustinmuebles.shared.ReglaNegocioException;

/** Puerto de almacenamiento con adaptador a disco local; todo archivo se cifra con AES-GCM. */
@Service
@Transactional
public class AlmacenamientoService {
    /** Detecta el tipo real por los bytes iniciales; ignora el Content-Type que declara el cliente. */
    static String detectarTipo(byte[] d) {
        if (d.length >= 5 && d[0] == '%' && d[1] == 'P' && d[2] == 'D' && d[3] == 'F' && d[4] == '-') return "application/pdf";
        if (d.length >= 8 && (d[0] & 0xFF) == 0x89 && d[1] == 'P' && d[2] == 'N' && d[3] == 'G') return "image/png";
        if (d.length >= 3 && (d[0] & 0xFF) == 0xFF && (d[1] & 0xFF) == 0xD8 && (d[2] & 0xFF) == 0xFF) return "image/jpeg";
        if (d.length >= 12 && d[0] == 'R' && d[1] == 'I' && d[2] == 'F' && d[3] == 'F' && d[8] == 'W' && d[9] == 'E'
                && d[10] == 'B' && d[11] == 'P') return "image/webp";
        return null;
    }

    private final ArchivoRepository repo;
    private final Path raiz;
    private final CifradoAes cifrado;

    AlmacenamientoService(ArchivoRepository repo, @Value("${app.storage.path}") String ruta,
            @Value("${app.storage.key}") String clave) {
        this.repo = repo;
        this.raiz = Path.of(ruta).toAbsolutePath();
        this.cifrado = new CifradoAes(clave);
        try {
            Files.createDirectories(raiz);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    public ArchivoGuardado guardar(MultipartFile f, boolean publico) {
        try {
            return guardar(f.getOriginalFilename() == null ? "archivo" : f.getOriginalFilename(),
                    f.getContentType() == null ? "application/octet-stream" : f.getContentType(), f.getBytes(), publico);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    public ArchivoGuardado guardar(String nombre, String contentType, byte[] datos, boolean publico) {
        if (datos.length == 0) {
            throw new ReglaNegocioException("El archivo está vacío");
        }
        String tipoReal = detectarTipo(datos);
        if (tipoReal == null) {
            throw new ReglaNegocioException("Tipo de archivo no permitido: solo PDF, PNG, JPG o WEBP");
        }
        contentType = tipoReal;
        nombre = nombre.replaceAll("[\\p{Cntrl}/\\\\]", "_");
        if (nombre.length() > 200) nombre = nombre.substring(nombre.length() - 200);
        ArchivoAlmacenado a = new ArchivoAlmacenado();
        a.setId(UUID.randomUUID().toString());
        a.setNombreOriginal(nombre);
        a.setContentType(contentType);
        a.setTamano(datos.length);
        a.setSha256(Hashing.sha256(datos));
        a.setPublico(publico);
        try {
            Files.write(raiz.resolve(a.getId() + ".bin"), cifrado.cifrar(datos));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        repo.save(a);
        return new ArchivoGuardado(a.getId(), nombre, contentType, datos.length, a.getSha256());
    }

    @Transactional(readOnly = true)
    public ArchivoContenido leer(String id) {
        ArchivoAlmacenado a = repo.findById(id).orElseThrow(() -> new NoEncontradoException("Archivo", id));
        try {
            byte[] datos = cifrado.descifrar(Files.readAllBytes(raiz.resolve(a.getId() + ".bin")));
            return new ArchivoContenido(a.getNombreOriginal(), a.getContentType(), datos, a.isPublico());
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
