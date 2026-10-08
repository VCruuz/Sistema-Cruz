package com.cruzengenharia.sistema.model;

// --- MODEL: RELATÓRIO ---

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import org.hibernate.annotations.NotFound;
import org.hibernate.annotations.NotFoundAction;
import java.math.BigDecimal;
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

    // --- VÍNCULO COM SERVIÇO ---
    // Obrigatório na geração, mas pode ficar NULL depois: ao excluir o serviço o relatório
    // é preservado e apenas desvinculado (ver ServicoService.excluir)
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_servico")
    @NotFound(action = NotFoundAction.IGNORE)
    @JsonIgnoreProperties({"hibernateLazyInitializer","handler","servicoOrigem"})
    private Servico servico;

    // --- DADOS DO SERVIÇO REGISTRADOS NA GERAÇÃO ---
    // Mantêm o relatório legível (card, detalhes e PDF) mesmo após o serviço ser excluído
    @Column(length = 100)
    private String servicoTipo;

    @Column(length = 150)
    private String clienteNome;

    private LocalDate servicoDataInicio;

    @Column(precision = 12, scale = 2)
    private BigDecimal servicoPreco;

    private LocalDate dataGeracao;

    @NotBlank(message = "Descrição é obrigatória.")
    @Column(columnDefinition = "TEXT")
    private String descricao;
}
