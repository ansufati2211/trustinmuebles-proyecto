package pe.trustinmuebles.orientacion;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/glosario")
class GlosarioController {
    private final GlosarioService glosario;

    GlosarioController(GlosarioService glosario) {
        this.glosario = glosario;
    }

    @GetMapping
    List<TerminoDto> listar() {
        return glosario.listar();
    }
}
