package pe.trustinmuebles;

import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;
import org.springframework.modulith.docs.Documenter;

/** Garantiza que los módulos solo se comuniquen por sus APIs públicas (REQ-NF02) y genera la documentación. */
class ModularityTests {
    private final ApplicationModules modulos = ApplicationModules.of(TrustinmueblesBackendApplication.class);

    @Test
    void respetaLosLimitesEntreModulos() {
        modulos.verify();
    }

    @Test
    void generaDocumentacionDeModulos() {
        new Documenter(modulos).writeModulesAsPlantUml().writeIndividualModulesAsPlantUml();
    }
}
