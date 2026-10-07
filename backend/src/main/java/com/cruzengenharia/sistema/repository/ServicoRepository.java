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
    @Modifying
    @Query("UPDATE Servico s SET s.servicoOrigem = null WHERE s.servicoOrigem.idServico = :idOrigem")
    int desvincularDerivados(@Param("idOrigem") Long idOrigem);
}
