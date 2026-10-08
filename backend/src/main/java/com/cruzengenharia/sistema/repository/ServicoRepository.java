package com.cruzengenharia.sistema.repository;

import com.cruzengenharia.sistema.model.Servico;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ServicoRepository extends JpaRepository<Servico, Long> {

    // --- Remove o vínculo de origem dos serviços derivados (usado antes de excluir o serviço pai) ---
    // SQL nativo direto na coluna: o JPQL gerava "WHERE EXISTS (SELECT ... FROM servicos)",
    // que o MySQL rejeita ("You can't specify target table 'servicos' for update in FROM clause")
    @Modifying
    @Query(value = "UPDATE servicos SET id_servico_origem = NULL WHERE id_servico_origem = :idOrigem",
           nativeQuery = true)
    int desvincularDerivados(@Param("idOrigem") Long idOrigem);
}
