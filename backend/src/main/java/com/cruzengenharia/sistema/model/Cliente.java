package com.cruzengenharia.sistema.model;

// --- MODEL: CLIENTE ---

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

@Entity
@Table(name = "clientes")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Cliente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idCliente;

    @NotBlank(message = "Nome é obrigatório.")
    @Size(min = 2, max = 150, message = "Nome deve ter entre 2 e 150 caracteres.")
    @Column(nullable = false, length = 150)
    private String nome;

    // Formato estrito: (XX) 9XXXX-XXXX — DDD 2 dígitos + celular 9 dígitos começando com 9
    @NotBlank(message = "Telefone é obrigatório.")
    @Pattern(
        regexp = "^\\(\\d{2}\\) 9\\d{4}-\\d{4}$",
        message = "Telefone inválido. Use o formato (XX) 9XXXX-XXXX."
    )
    @Column(length = 20)
    private String telefone;

    @NotBlank(message = "E-mail é obrigatório.")
    @Email(message = "E-mail inválido.")
    @Column(length = 150)
    private String email;

    @NotBlank(message = "Endereço é obrigatório.")
    @Column(length = 255)
    private String endereco;
}
