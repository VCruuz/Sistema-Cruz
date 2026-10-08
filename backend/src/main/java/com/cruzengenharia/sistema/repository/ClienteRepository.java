package com.cruzengenharia.sistema.repository;

import com.cruzengenharia.sistema.model.Cliente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClienteRepository extends JpaRepository<Cliente, Long> {

    // --- Somente clientes ativos (NULL = registro antigo, considerado ativo) ---
    @Query("SELECT c FROM Cliente c WHERE c.ativo IS NULL OR c.ativo = true ORDER BY c.nome")
    List<Cliente> listarAtivos();

    // --- SOFT DELETE: SQL nativo para não reaplicar validações de cadastros antigos ---
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "UPDATE clientes SET ativo = 0, data_exclusao = CURRENT_DATE WHERE id_cliente = :id",
           nativeQuery = true)
    int desativar(@Param("id") Long id);
}
