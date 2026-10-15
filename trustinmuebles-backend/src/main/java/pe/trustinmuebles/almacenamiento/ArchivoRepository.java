package pe.trustinmuebles.almacenamiento;

import org.springframework.data.jpa.repository.JpaRepository;

interface ArchivoRepository extends JpaRepository<ArchivoAlmacenado, String> {}
