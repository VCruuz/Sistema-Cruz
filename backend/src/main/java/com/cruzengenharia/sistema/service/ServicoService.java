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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ServicoService {

    private final ServicoRepository servicoRepository;
    private final RelatorioRepository relatorioRepository;
    private final ClienteService clienteService;

    // --- MÁQUINA DE ESTADOS: constantes de status ---
    private static final String EM_ANALISE   = "Em Análise";
    private static final String REMARCADO    = "Remarcado";
    private static final String EM_PROGRESSO = "Em Progresso";
    private static final String CONCLUIDO    = "Concluído";
    private static final String CANCELADO    = "Cancelado";

    // Status a partir dos quais o serviço pode ser remarcado (quantas vezes for preciso)
    private static final Set<String> PODE_REMARCAR = Set.of(EM_ANALISE, REMARCADO);
    // Status finais: serviço fica somente leitura (sem edição, remarcação ou exclusão)
    private static final Set<String> FINALIZADOS   = Set.of(CONCLUIDO, CANCELADO);

    private static final BigDecimal PRECO_MINIMO = new BigDecimal("0.01");

    // --- TRANSIÇÕES VÁLIDAS PELA ALTERAÇÃO DE STATUS (Diagrama de Estados) ---
    // Em Análise   → Em Progresso (aprovado) | Cancelado
    // Remarcado    → Em Progresso (aprovado) | Cancelado (rejeitado novamente)
    // Em Progresso → Concluído | Cancelado
    // Concluído / Cancelado → estados finais (somente leitura)
    // "Remarcado" NÃO é escolhido aqui: só é aplicado pelo fluxo remarcar(), que exige nova data.
    private static final Map<String, Set<String>> TRANSICOES = Map.of(
        EM_ANALISE,   Set.of(EM_PROGRESSO, CANCELADO),
        REMARCADO,    Set.of(EM_PROGRESSO, CANCELADO),
        EM_PROGRESSO, Set.of(CONCLUIDO, CANCELADO),
        CONCLUIDO,    Set.of(),
        CANCELADO,    Set.of()
    );

    // --- LISTAGEM HIERÁRQUICA: cada recorrente logo abaixo do serviço que o gerou ---
    public List<Servico> listarTodos() {
        List<Servico> todos = servicoRepository.findAll();
        todos.sort(Comparator.comparing(Servico::getIdServico));

        Map<Long, List<Servico>> filhosPorOrigem = new HashMap<>();
        List<Servico> raizes = new ArrayList<>();
        for (Servico s : todos) {
            if (s.getServicoOrigem() == null) raizes.add(s);
            else filhosPorOrigem.computeIfAbsent(s.getServicoOrigem().getIdServico(), k -> new ArrayList<>()).add(s);
        }

        List<Servico> ordenados = new ArrayList<>(todos.size());
        Set<Long> visitados = new HashSet<>();
        for (Servico raiz : raizes) adicionarComFilhos(raiz, filhosPorOrigem, ordenados, visitados);
        // Segurança: qualquer serviço não alcançado (ex.: ciclo) entra no fim
        for (Servico s : todos) if (!visitados.contains(s.getIdServico())) adicionarComFilhos(s, filhosPorOrigem, ordenados, visitados);
        return ordenados;
    }

    private void adicionarComFilhos(Servico s, Map<Long, List<Servico>> filhos, List<Servico> saida, Set<Long> visitados) {
        if (!visitados.add(s.getIdServico())) return;
        saida.add(s);
        for (Servico f : filhos.getOrDefault(s.getIdServico(), List.of())) adicionarComFilhos(f, filhos, saida, visitados);
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
        Cliente cliente = buscarCliente(dto.getIdCliente());
        validarDataNaoRetroativa(dto.getDataInicio());
        validarPrazo(dto.getDataInicio(), dto.getPrazoEntrega());
        validarPreco(dto.getPreco());

        Servico servico = Servico.builder()
                .cliente(cliente)
                .tipoServico(dto.getTipoServico())
                .descricao(dto.getDescricao())
                .dataInicio(dto.getDataInicio())
                .prazoEntrega(dto.getPrazoEntrega())
                .preco(dto.getPreco())
                .status(EM_ANALISE)
                .dataCriado(LocalDate.now())
                .dataUltimo(LocalDate.now())
                .build();

        return servicoRepository.save(servico);
    }

    // --- EDITAR: dados + transição de status ---
    // A data de início só muda pelo fluxo "Remarcar"; "Remarcado" não pode ser escolhido aqui.
    public Servico editarServico(Long id, ServicoRequestDTO dto) {
        Servico existente = buscarPorId(id);
        validarNaoFinalizado(existente, "editado");
        Cliente cliente   = buscarCliente(dto.getIdCliente());
        validarPreco(dto.getPreco());

        if (dto.getDataInicio() != null && !dto.getDataInicio().equals(existente.getDataInicio())) {
            throw new RuntimeException("A data de início só pode ser alterada pelo fluxo de Remarcar.");
        }
        LocalDate novoPrazo = dto.getPrazoEntrega() != null ? dto.getPrazoEntrega() : existente.getPrazoEntrega();
        validarPrazo(existente.getDataInicio(), novoPrazo);

        // Transição de status (se houve mudança)
        if (dto.getStatus() != null && !dto.getStatus().equals(existente.getStatus())) {
            if (REMARCADO.equals(dto.getStatus())) {
                throw new RuntimeException("Para remarcar o serviço, use a opção Remarcar e informe a nova data.");
            }
            validarTransicao(existente.getStatus(), dto.getStatus());
            existente.setStatus(dto.getStatus());
        }

        existente.setCliente(cliente);
        existente.setTipoServico(dto.getTipoServico());
        existente.setDescricao(dto.getDescricao());
        existente.setPrazoEntrega(novoPrazo);
        existente.setPreco(dto.getPreco());
        existente.setDataUltimo(LocalDate.now());
        return servicoRepository.save(existente);
    }

    // --- REMARCAR: Em Análise ou Remarcado → Remarcado + nova data de início obrigatória ---
    // Pode ser repetido quantas vezes for necessário enquanto o status permitir.
    public Servico remarcar(Long id, LocalDate novaDataInicio, LocalDate novoPrazo) {
        Servico servico = buscarPorId(id);
        if (!PODE_REMARCAR.contains(servico.getStatus())) {
            throw new RuntimeException(
                "Só é possível remarcar serviços com status 'Em Análise' ou 'Remarcado' (atual: '"
                + servico.getStatus() + "')."
            );
        }
        validarDataRemarcacao(servico.getDataInicio(), novaDataInicio);
        validarDataRecorrencia(servico.getServicoOrigem(), novaDataInicio);

        LocalDate prazo = novoPrazo != null ? novoPrazo : servico.getPrazoEntrega();
        validarPrazo(novaDataInicio, prazo);

        servico.setStatus(REMARCADO);
        servico.setDataInicio(novaDataInicio);
        servico.setPrazoEntrega(prazo);
        servico.setDataUltimo(LocalDate.now());
        return servicoRepository.save(servico);
    }

    // --- GERAR RECORRÊNCIA: só a partir de serviço "Em Progresso"; mesmo cliente ---
    public Servico gerarServicoVinculado(Long idOrigem, ServicoRequestDTO dto) {
        Servico origem = buscarPorId(idOrigem);
        if (!EM_PROGRESSO.equals(origem.getStatus())) {
            throw new RuntimeException("Só é possível gerar recorrência de um serviço com status 'Em Progresso'.");
        }
        Cliente cliente = origem.getCliente(); // herda cliente da origem

        validarDataNaoRetroativa(dto.getDataInicio());
        validarDataRecorrencia(origem, dto.getDataInicio());
        validarPrazo(dto.getDataInicio(), dto.getPrazoEntrega());
        validarPreco(dto.getPreco());

        Servico novo = Servico.builder()
                .cliente(cliente)
                .servicoOrigem(origem)
                .tipoServico(dto.getTipoServico())
                .descricao(dto.getDescricao())
                .dataInicio(dto.getDataInicio())
                .prazoEntrega(dto.getPrazoEntrega())
                .preco(dto.getPreco())
                .status(EM_ANALISE)
                .dataCriado(LocalDate.now())
                .dataUltimo(LocalDate.now())
                .build();

        return servicoRepository.save(novo);
    }

    // --- EXCLUIR: tudo em SQL nativo, sem carregar a entidade e sem subconsultas na tabela servicos ---
    // 1) relatórios são PRESERVADOS: recebem os dados do serviço e são desvinculados
    // 2) desvincula os serviços filhos  3) apaga o serviço
    // Vale para qualquer status: Concluídos/Cancelados são somente leitura para edição,
    // mas podem ser excluídos (os relatórios já gerados continuam existindo).
    @Transactional
    public void excluir(Long id) {
        if (id == null || servicoRepository.contarPorId(id) == 0) return; // já não existe: idempotente
        try {
            relatorioRepository.registrarDadosDoServico(id);
            relatorioRepository.desvincularDoServico(id);
            servicoRepository.desvincularDerivados(id);
            int removidos = servicoRepository.excluirPorIdNativo(id);
            if (removidos == 0) {
                throw new RuntimeException("Não foi possível excluir o serviço. Tente novamente.");
            }
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new RuntimeException(
                "Não é possível excluir este serviço pois ele possui registros vinculados."
            );
        }
    }

    // ===================== VALIDAÇÕES =====================

    private void validarNaoFinalizado(Servico servico, String acao) {
        if (FINALIZADOS.contains(servico.getStatus())) {
            throw new RuntimeException(
                "Serviços '" + servico.getStatus() + "' são somente leitura e não podem ser " + acao + "."
            );
        }
    }

    private Cliente buscarCliente(Long idCliente) {
        // Validação explícita do id — impede EntityNotFoundException com id 0
        if (idCliente == null || idCliente <= 0) {
            throw new RuntimeException("Selecione um cliente válido antes de salvar o serviço.");
        }
        return clienteService.visualizarCliente(idCliente);
    }

    private void validarPreco(BigDecimal preco) {
        if (preco == null || preco.compareTo(PRECO_MINIMO) < 0) {
            throw new RuntimeException("O preço deve ser de no mínimo R$ 0,01.");
        }
    }

    private void validarDataNaoRetroativa(LocalDate data) {
        if (data == null) throw new RuntimeException("Data de início é obrigatória.");
        if (data.isBefore(LocalDate.now())) {
            throw new RuntimeException("A data de início não pode ser retroativa.");
        }
    }

    private void validarPrazo(LocalDate inicio, LocalDate prazo) {
        if (prazo == null) throw new RuntimeException("Prazo de entrega é obrigatório.");
        if (inicio != null && prazo.isBefore(inicio)) {
            throw new RuntimeException("O prazo de entrega não pode ser anterior à data de início.");
        }
    }

    // Remarcado: data de início obrigatória, diferente da atual e não retroativa
    private void validarDataRemarcacao(LocalDate dataAtual, LocalDate novaData) {
        if (novaData == null || novaData.equals(dataAtual)) {
            throw new RuntimeException("Para remarcar, informe uma nova data de início diferente da atual.");
        }
        validarDataNaoRetroativa(novaData);
    }

    // Recorrência: serviço derivado só pode iniciar após a data de início do serviço primário
    private void validarDataRecorrencia(Servico origem, LocalDate data) {
        if (origem == null || origem.getDataInicio() == null || data == null) return;
        if (!data.isAfter(origem.getDataInicio())) {
            throw new RuntimeException(
                "A data de início do serviço recorrente deve ser posterior à do serviço de origem ("
                + origem.getDataInicio() + ")."
            );
        }
    }

    private void validarTransicao(String atual, String novo) {
        if (!TRANSICOES.getOrDefault(atual, Set.of()).contains(novo)) {
            throw new RuntimeException(
                "Transição de status inválida: '" + atual + "' → '" + novo + "'"
            );
        }
    }
}
