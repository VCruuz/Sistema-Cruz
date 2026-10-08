package com.cruzengenharia.sistema.controller;

// --- CONTROLLER DE RELATÓRIOS ---

import com.cruzengenharia.sistema.dto.RelatorioRequestDTO;
import com.cruzengenharia.sistema.model.Relatorio;
import com.cruzengenharia.sistema.service.RelatorioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/relatorios")
@RequiredArgsConstructor
public class RelatorioController {

    private final RelatorioService relatorioService;

    @GetMapping
    public List<Relatorio> listarTodos() {
        return relatorioService.listarTodos();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Relatorio> selecionarRelatorio(@PathVariable Long id) {
        // Relatório inexistente → 204 (sem corpo) em vez de erro
        return relatorioService.selecionarRelatorio(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    // --- GERAR RELATÓRIO: POST /api/relatorios/gerar ---
    @PostMapping("/gerar")
    public ResponseEntity<Relatorio> gerarRelatorio(@Valid @RequestBody RelatorioRequestDTO dto) {
        return ResponseEntity.ok(relatorioService.gerarRelatorio(dto));
    }

    // --- EXPORTAR PDF: GET /api/relatorios/{id}/pdf ---
    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> exportarPdf(@PathVariable Long id) throws Exception {
        var pdfOpt = relatorioService.exportarPdf(id);
        if (pdfOpt.isEmpty()) return ResponseEntity.noContent().build();
        byte[] pdf = pdfOpt.get();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=relatorio-" + id + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }
}
