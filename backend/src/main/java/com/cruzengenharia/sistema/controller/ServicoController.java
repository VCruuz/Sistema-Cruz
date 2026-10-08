package com.cruzengenharia.sistema.controller;

// --- CONTROLLER DE SERVIÇOS ---

import com.cruzengenharia.sistema.dto.ServicoRequestDTO;
import com.cruzengenharia.sistema.model.Servico;
import com.cruzengenharia.sistema.service.ServicoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/servicos")
@RequiredArgsConstructor
public class ServicoController {

    private final ServicoService servicoService;

    @GetMapping
    public List<Servico> listarTodos() {
        return servicoService.listarTodos();
    }

    @GetMapping("/{id}")
    // Serviço inexistente → 204 (sem corpo) em vez de erro
    public ResponseEntity<Servico> buscarPorId(@PathVariable Long id) {
        return servicoService.buscarOpcional(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/{id}/acompanhar")
    public ResponseEntity<Servico> acompanhar(@PathVariable Long id) {
        return servicoService.acompanhar(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PostMapping
    public ResponseEntity<Servico> cadastrarServico(@Valid @RequestBody ServicoRequestDTO dto) {
        return ResponseEntity.ok(servicoService.cadastrarServico(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Servico> editarServico(@PathVariable Long id, @Valid @RequestBody ServicoRequestDTO dto) {
        return ResponseEntity.ok(servicoService.editarServico(id, dto));
    }

    // --- REMARCAR: PUT /api/servicos/{id}/remarcar?novaData=YYYY-MM-DD ---
    @PutMapping("/{id}/remarcar")
    public ResponseEntity<Servico> remarcar(
            @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate novaData) {
        return ResponseEntity.ok(servicoService.remarcar(id, novaData));
    }

    // --- SERVIÇO VINCULADO: POST /api/servicos/{id}/vinculado ---
    @PostMapping("/{id}/vinculado")
    public ResponseEntity<Servico> gerarServicoVinculado(
            @PathVariable Long id,
            @Valid @RequestBody ServicoRequestDTO dto) {
        return ResponseEntity.ok(servicoService.gerarServicoVinculado(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        servicoService.excluir(id);
        return ResponseEntity.noContent().build();
    }
}
