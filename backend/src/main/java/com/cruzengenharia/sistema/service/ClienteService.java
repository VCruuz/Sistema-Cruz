package com.cruzengenharia.sistema.service;

// --- SERVICE: CLIENTE ---

import com.cruzengenharia.sistema.model.Cliente;
import com.cruzengenharia.sistema.repository.ClienteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ClienteService {

    private final ClienteRepository clienteRepository;

    // Lista apenas clientes ativos (excluídos ficam ocultos, mas preservados no histórico)
    public List<Cliente> listarCliente() {
        return clienteRepository.listarAtivos();
    }

    public Cliente visualizarCliente(Long id) {
        return clienteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cliente não encontrado: " + id));
    }

    public Cliente cadastrarCliente(Cliente cliente) {
        return clienteRepository.save(cliente);
    }

    public Cliente editarCliente(Long id, Cliente dados) {
        Cliente existente = visualizarCliente(id);
        if (existente.isExcluido()) {
            throw new RuntimeException("Este cliente foi excluído e não pode ser editado.");
        }
        existente.setNome(dados.getNome());
        existente.setTelefone(dados.getTelefone());
        existente.setEmail(dados.getEmail());
        existente.setEndereco(dados.getEndereco());
        return salvarCliente(existente);
    }

    public Cliente salvarCliente(Cliente cliente) {
        return clienteRepository.save(cliente);
    }

    // --- SOFT DELETE: marca como inativo; serviços e relatórios continuam apontando para ele ---
    @Transactional
    public void excluirCliente(Long id) {
        if (id == null) return;
        clienteRepository.desativar(id); // idempotente: cliente inexistente não gera erro
    }
}
