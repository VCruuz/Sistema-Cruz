package com.cruzengenharia.sistema.dto;

// --- DTO: CRIAÇÃO / EDIÇÃO DE SERVIÇO ---

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class ServicoRequestDTO {

    // @NotNull + @Min(1) garante que nunca chegue null, 0 ou negativo
    @NotNull(message = "Cliente é obrigatório.")
    @Min(value = 1, message = "ID de cliente inválido.")
    @JsonAlias("clienteId")
    private Long idCliente;

    // Opcional: presente apenas quando é um serviço derivado de outro
    private Long idServicoOrigem;

    @NotBlank(message = "Tipo de serviço é obrigatório.")
    private String tipoServico;

    private String descricao;

    // Regras de data (não retroativa, prazo ≥ início, recorrência) ficam no ServicoService,
    // pois na edição a data antiga pode estar no passado e não deve bloquear o salvamento.
    @NotNull(message = "Data de início é obrigatória.")
    @JsonAlias("dataServico")
    private LocalDate dataInicio;

    @NotNull(message = "Prazo de entrega é obrigatório.")
    private LocalDate prazoEntrega;

    @NotNull(message = "Preço é obrigatório.")
    @DecimalMin(value = "0.01", message = "O preço deve ser de no mínimo R$ 0,01.")
    @Digits(integer = 10, fraction = 2, message = "Preço inválido (máx. 2 casas decimais).")
    private BigDecimal preco;

    // Usado apenas em edições para transição de status (máquina de estados)
    private String status;
}
