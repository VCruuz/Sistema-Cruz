package com.cruzengenharia.sistema.model;

// --- MODEL: SERVIÇO ---

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.NotFound;
import org.hibernate.annotations.NotFoundAction;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "servicos")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Servico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idServico;

    // --- VÍNCULO OBRIGATÓRIO COM CLIENTE ---
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_cliente")
    // Registros antigos gravados com id_cliente = 0 (bug anterior) não derrubam a listagem
    // com "Unable to find Cliente with id 0" — o cliente inexistente vira null.
    @NotFound(action = NotFoundAction.IGNORE)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Cliente cliente;

    // --- NOME DO CLIENTE REGISTRADO (histórico) ---
    // Mantém a identificação do contratante mesmo se o cliente for excluído/removido
    @Column(name = "cliente_nome", length = 150)
    private String clienteNome;

    // --- SERVIÇO DE ORIGEM: vínculo com serviço derivado (opcional) ---
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_servico_origem")
    // Origem apagada não derruba a listagem com "Unable to find Servico with id X"
    @NotFound(action = NotFoundAction.IGNORE)
    // Inclui o cliente da origem (usado no texto "Gerado a partir de: ..."); evita aninhar a origem da origem
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "servicoOrigem"})
    private Servico servicoOrigem;

    // --- TIPO PREDEFINIDO ---
    @Column(nullable = false, length = 100)
    private String tipoServico;

    @Column(columnDefinition = "TEXT")
    private String descricao;

    // --- DATAS DO SERVIÇO ---
    // dataInicio reaproveita a coluna antiga "data_servico" para preservar os dados já cadastrados
    @Column(name = "data_servico")
    private LocalDate dataInicio;

    // Prazo de entrega: deve ser igual ou posterior à data de início
    @Column(name = "prazo_entrega")
    private LocalDate prazoEntrega;

    // --- PREÇO (R$): mínimo de R$ 0,01 (validado no DTO/service) ---
    @Column(precision = 12, scale = 2)
    private BigDecimal preco;

    // --- MÁQUINA DE ESTADOS ---
    // "Em Análise" | "Remarcado" | "Em Progresso" | "Concluído" | "Cancelado"
    @Column(nullable = false, length = 30)
    private String status;

    private LocalDate dataCriado;
    private LocalDate dataUltimo;
}
