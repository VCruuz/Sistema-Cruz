package com.cruzengenharia.sistema.dto;

// --- DTO: CRIAÇÃO DE RELATÓRIO ---

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class RelatorioRequestDTO {

    @NotNull(message = "Serviço vinculado é obrigatório.")
    private Long idServico;

    @NotBlank(message = "Descrição é obrigatória.")
    private String descricao;
}
