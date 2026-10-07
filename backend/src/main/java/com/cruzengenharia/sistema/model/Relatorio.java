package com.cruzengenharia.sistema.model;

// --- MODEL: RELATÓRIO ---

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Table(name = "relatorios")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Relatorio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idRelatorio;

    // --- VÍNCULO OBRIGATÓRIO COM SERVIÇO ---
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_servico", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer","handler","servicoOrigem"})
    @NotNull(message = "Serviço vinculado é obrigatório.")
    private Servico servico;

    private LocalDate dataGeracao;

    @NotBlank(message = "Descrição é obrigatória.")
    @Column(columnDefinition = "TEXT")
    private String descricao;
}
