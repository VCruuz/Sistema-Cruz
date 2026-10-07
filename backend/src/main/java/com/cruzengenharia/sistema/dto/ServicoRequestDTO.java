package com.cruzengenharia.sistema.dto;

// --- DTO: CRIAÇÃO / EDIÇÃO DE SERVIÇO ---

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.*;
import lombok.Data;
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

    // Null é permitido na edição; quando presente, não pode ser data passada
    @FutureOrPresent(message = "A data do serviço não pode ser retroativa.")
    private LocalDate dataServico;

    // Usado apenas em edições para transição de status (máquina de estados)
    private String status;
}
