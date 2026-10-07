package com.cruzengenharia.sistema.model;

// --- MODEL: SERVIÇO ---

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
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
    @JoinColumn(name = "id_cliente", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Cliente cliente;

    // --- SERVIÇO DE ORIGEM: vínculo com serviço derivado (opcional) ---
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_servico_origem")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "cliente", "servicoOrigem"})
    private Servico servicoOrigem;

    // --- TIPO PREDEFINIDO ---
    @Column(nullable = false, length = 100)
    private String tipoServico;

    @Column(columnDefinition = "TEXT")
    private String descricao;

    // @FutureOrPresent NÃO fica no model pois editarServico/remarcar não
    // recebem o model diretamente — a validação de data fica no DTO
    private LocalDate dataServico;

    // --- MÁQUINA DE ESTADOS ---
    // "Em Análise" | "Em Progresso" | "Concluído" | "Cancelado" | "Remarcado"
    @Column(nullable = false, length = 30)
    private String status;

    private LocalDate dataCriado;
    private LocalDate dataUltimo;
}
