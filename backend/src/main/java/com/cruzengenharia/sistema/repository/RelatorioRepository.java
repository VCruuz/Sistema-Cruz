package com.cruzengenharia.sistema.repository;

import com.cruzengenharia.sistema.model.Relatorio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface RelatorioRepository extends JpaRepository<Relatorio, Long> {

    // --- Antes de excluir um serviço: grava os dados dele nos relatórios (se ainda vazios) ---
    // UPDATE na tabela relatorios com JOIN em servicos/clientes (permitido no MySQL)
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = """
        UPDATE relatorios r
          JOIN servicos s ON s.id_servico = r.id_servico
          LEFT JOIN clientes c ON c.id_cliente = s.id_cliente
           SET r.servico_tipo        = COALESCE(r.servico_tipo, s.tipo_servico),
               r.cliente_nome        = COALESCE(r.cliente_nome, c.nome),
               r.servico_data_inicio = COALESCE(r.servico_data_inicio, s.data_servico),
               r.servico_preco       = COALESCE(r.servico_preco, s.preco)
         WHERE r.id_servico = :idServico
        """, nativeQuery = true)
    int registrarDadosDoServico(@Param("idServico") Long idServico);

    // --- Desvincula (não exclui) os relatórios de um serviço que será excluído ---
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "UPDATE relatorios SET id_servico = NULL WHERE id_servico = :idServico", nativeQuery = true)
    int desvincularDoServico(@Param("idServico") Long idServico);

    // --- Exclusão de um relatório pela PK (SQL nativo, sem carregar o serviço vinculado) ---
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "DELETE FROM relatorios WHERE id_relatorio = :id", nativeQuery = true)
    int excluirPorIdNativo(@Param("id") Long id);
}
