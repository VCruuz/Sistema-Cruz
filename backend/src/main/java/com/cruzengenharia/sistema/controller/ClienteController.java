package com.cruzengenharia.sistema.controller;

// --- CONTROLLER DE CLIENTES ---

import com.cruzengenharia.sistema.model.Cliente;
import com.cruzengenharia.sistema.service.ClienteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/clientes")
@RequiredArgsConstructor
public class ClienteController {

    private final ClienteService clienteService;

    @GetMapping
    public List<Cliente> listarCliente() {
        return clienteService.listarCliente();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Cliente> visualizarCliente(@PathVariable Long id) {
        return ResponseEntity.ok(clienteService.visualizarCliente(id));
    }

    @PostMapping
    public ResponseEntity<Cliente> cadastrarCliente(@Valid @RequestBody Cliente cliente) {
        return ResponseEntity.ok(clienteService.cadastrarCliente(cliente));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Cliente> editarCliente(@PathVariable Long id, @Valid @RequestBody Cliente cliente) {
        return ResponseEntity.ok(clienteService.editarCliente(id, cliente));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluirCliente(@PathVariable Long id) {
        clienteService.excluirCliente(id);
        return ResponseEntity.noContent().build();
    }
}
