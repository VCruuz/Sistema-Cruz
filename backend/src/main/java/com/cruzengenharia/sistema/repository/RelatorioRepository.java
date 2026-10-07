package com.cruzengenharia.sistema.repository;

import com.cruzengenharia.sistema.model.Relatorio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface RelatorioRepository extends JpaRepository<Relatorio, Long> {

    // --- Exclusão em cascata: remove os relatórios de um serviço ---
    @Modifying
    @Query("DELETE FROM Relatorio r WHERE r.servico.idServico = :idServico")
    int excluirPorServico(@Param("idServico") Long idServico);
}
