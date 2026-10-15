package pe.trustinmuebles.almacenamiento;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

/** Cifrado AES-256-GCM en reposo (REQ-NF03). Formato: [iv 12 bytes][texto cifrado + tag]. */
class CifradoAes {
    private static final int IV_BYTES = 12;
    private final SecretKey clave;
    private final SecureRandom random = new SecureRandom();

    CifradoAes(String passphrase) {
        try {
            byte[] k = MessageDigest.getInstance("SHA-256").digest(passphrase.getBytes(StandardCharsets.UTF_8));
            this.clave = new SecretKeySpec(k, "AES");
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }

    byte[] cifrar(byte[] plano) {
        try {
            byte[] iv = new byte[IV_BYTES];
            random.nextBytes(iv);
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.ENCRYPT_MODE, clave, new GCMParameterSpec(128, iv));
            byte[] ct = c.doFinal(plano);
            return ByteBuffer.allocate(iv.length + ct.length).put(iv).put(ct).array();
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("No se pudo cifrar el archivo", e);
        }
    }

    byte[] descifrar(byte[] cifrado) {
        try {
            ByteBuffer bb = ByteBuffer.wrap(cifrado);
            byte[] iv = new byte[IV_BYTES];
            bb.get(iv);
            byte[] ct = new byte[bb.remaining()];
            bb.get(ct);
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.DECRYPT_MODE, clave, new GCMParameterSpec(128, iv));
            return c.doFinal(ct);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Archivo corrupto o alterado", e);
        }
    }
}
