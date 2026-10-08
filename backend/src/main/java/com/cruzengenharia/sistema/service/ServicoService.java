package com.cruzengenharia.sistema.service;

// --- SERVICE: SERVIÇO + MÁQUINA DE ESTADOS ---

import com.cruzengenharia.sistema.dto.ServicoRequestDTO;
import com.cruzengenharia.sistema.model.Cliente;
import com.cruzengenharia.sistema.model.Servico;
import com.cruzengenharia.sistema.repository.RelatorioRepository;
import com.cruzengenharia.sistema.repository.ServicoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ServicoService {

    private final ServicoRepository servicoRepository;
    private final RelatorioRepository relatorioRepository;
    private final ClienteService clienteService;

    // --- MÁQUINA DE ESTADOS: constantes de status ---
    private static final String EM_ANALISE   = "Em Análise";
    private static final String EM_PROGRESSO = "Em Progresso";
    private static final String CONCLUIDO    = "Concluído";
    private static final String CANCELADO    = "Cancelado";
    private static final String REMARCADO    = "Remarcado";

    public List<Servico> listarTodos() {
        return servicoRepository.findAll();
    }

    public Servico buscarPorId(Long id) {
        return servicoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("O serviço selecionado não existe mais. Atualize a lista."));
    }

    // --- CONSULTA TOLERANTE: serviço inexistente → Optional vazio (sem exceção) ---
    public Optional<Servico> buscarOpcional(Long id) {
        return id == null ? Optional.empty() : servicoRepository.findById(id);
    }

    public Optional<Servico> acompanhar(Long id) {
        return buscarOpcional(id);
    }

    // --- CADASTRAR: status inicial sempre "Em Análise" ---
    public Servico cadastrarServico(ServicoRequestDTO dto) {
        // Validação explícita do id — impede EntityNotFoundException com id 0
        if (dto.getIdCliente() == null || dto.getIdCliente() <= 0) {
            throw new RuntimeException("Selecione um cliente válido antes de salvar o serviço.");
        }
        Cliente cliente = clienteService.visualizarCliente(dto.getIdCliente());

        Servico servico = Servico.builder()
                .cliente(cliente)
                .tipoServico(dto.getTipoServico())
                .descricao(dto.getDescricao())
                .dataServico(dto.getDataServico())
                .status(EM_ANALISE)
                .dataCriado(LocalDate.now())
                .dataUltimo(LocalDate.now())
                .build();

        return servicoRepository.save(servico);
    }

    // --- EDITAR: valida transição de status, preserva data se não fornecida ---
    public Servico editarServico(Long id, ServicoRequestDTO dto) {
        Servico existente = buscarPorId(id);
        // Validação explícita do id do cliente
        if (dto.getIdCliente() == null || dto.getIdCliente() <= 0) {
            throw new RuntimeException("Selecione um cliente válido antes de salvar o serviço.");
        }
        Cliente cliente = clienteService.visualizarCliente(dto.getIdCliente());

        // Valida transição de status se houve mudança
        if (dto.getStatus() != null && !dto.getStatus().equals(existente.getStatus())) {
            validarTransicao(existente.getStatus(), dto.getStatus());
            existente.setStatus(dto.getStatus());
        }

        existente.setCliente(cliente);
        existente.setTipoServico(dto.getTipoServico());
        existente.setDescricao(dto.getDescricao());

        // Preserva data existente se o DTO não trouxer uma nova
        if (dto.getDataServico() != null) {
            // Só valida a recorrência quando a data muda (não bloqueia edição de status de registros antigos)
            if (!dto.getDataServico().equals(existente.getDataServico())) {
                validarDataRecorrencia(existente.getServicoOrigem(), dto.getDataServico());
            }
            existente.setDataServico(dto.getDataServico());
        }

        existente.setDataUltimo(LocalDate.now());
        return servicoRepository.save(existente);
    }

    // --- REMARCAR: Concluído → Remarcado + nova data ---
    public Servico remarcar(Long id, LocalDate novaData) {
        Servico servico = buscarPorId(id);
        validarTransicao(servico.getStatus(), REMARCADO);
        validarDataRecorrencia(servico.getServicoOrigem(), novaData);
        servico.setStatus(REMARCADO);
        servico.setDataServico(novaData);
        servico.setDataUltimo(LocalDate.now());
        return servicoRepository.save(servico);
    }

    // --- GERAR SERVIÇO VINCULADO: novo serviço derivado, mesmo cliente ---
    public Servico gerarServicoVinculado(Long idOrigem, ServicoRequestDTO dto) {
        Servico origem  = buscarPorId(idOrigem);
        Cliente cliente = origem.getCliente(); // herda cliente da origem

        // Recorrência: data obrigatória e estritamente posterior à do serviço primário
        if (dto.getDataServico() == null) {
            throw new RuntimeException("Informe a data do serviço recorrente.");
        }
        validarDataRecorrencia(origem, dto.getDataServico());

        Servico novo = Servico.builder()
                .cliente(cliente)
                .servicoOrigem(origem)
                .tipoServico(dto.getTipoServico())
                .descricao(dto.getDescricao())
                .dataServico(dto.getDataServico())
                .status(EM_ANALISE)
                .dataCriado(LocalDate.now())
                .dataUltimo(LocalDate.now())
                .build();

        return servicoRepository.save(novo);
    }

    // --- EXCLUIR: remove relatórios vinculados (cascata) e desvincula serviços derivados ---
    @Transactional
    public void excluir(Long id) {
        Optional<Servico> encontrado = buscarOpcional(id);
        if (encontrado.isEmpty()) return; // já não existe: exclusão idempotente, sem erro na tela
        Servico servico = encontrado.get();
        try {
            relatorioRepository.excluirPorServico(id);
            servicoRepository.desvincularDerivados(id);
            servicoRepository.delete(servico);
            servicoRepository.flush(); // força o DELETE agora para capturar violação de FK aqui
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new RuntimeException(
                "Não é possível excluir este serviço pois ele possui registros vinculados."
            );
        }
    }

    // --- RECORRÊNCIA: serviço derivado só pode ocorrer após a data do serviço primário ---
    private void validarDataRecorrencia(Servico origem, LocalDate data) {
        if (origem == null || origem.getDataServico() == null || data == null) return;
        if (!data.isAfter(origem.getDataServico())) {
            throw new RuntimeException(
                "A data do serviço recorrente deve ser posterior à data do serviço de origem ("
                + origem.getDataServico() + ")."
            );
        }
    }

    // --- VALIDAÇÃO DA MÁQUINA DE ESTADOS ---
    private void validarTransicao(String atual, String novo) {
        boolean valida = switch (atual) {
            case "Em Análise"   -> novo.equals(EM_PROGRESSO) || novo.equals(CANCELADO);
            case "Em Progresso" -> novo.equals(CONCLUIDO)    || novo.equals(EM_ANALISE);
            case "Concluído"    -> novo.equals(REMARCADO);
            case "Remarcado"    -> novo.equals(EM_PROGRESSO) || novo.equals(CANCELADO);
            default             -> false;
        };
        if (!valida) {
            throw new RuntimeException(
                "Transição de status inválida: '" + atual + "' → '" + novo + "'"
            );
        }
    }
}
