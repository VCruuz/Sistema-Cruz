-- --- SEED: USUÁRIO PADRÃO DE ACESSO ---
-- Login: admin@cruzengenharia.com / admin123
-- Usa INSERT IGNORE para não duplicar em reinicializações

INSERT IGNORE INTO usuarios (nome, email, senha)
VALUES ('Administrador', 'admin@cruzengenharia.com', 'admin123');

-- --- RELATÓRIOS PRESERVADOS APÓS EXCLUSÃO DO SERVIÇO ---
-- O ddl-auto=update não altera a nulidade de colunas existentes: libera id_servico para NULL
ALTER TABLE relatorios MODIFY id_servico BIGINT NULL;

-- Preenche os dados registrados do serviço em relatórios antigos (gerados antes desses campos)
UPDATE relatorios r
  JOIN servicos s ON s.id_servico = r.id_servico
  LEFT JOIN clientes c ON c.id_cliente = s.id_cliente
   SET r.servico_tipo        = COALESCE(r.servico_tipo, s.tipo_servico),
       r.cliente_nome        = COALESCE(r.cliente_nome, c.nome),
       r.servico_data_inicio = COALESCE(r.servico_data_inicio, s.data_servico),
       r.servico_preco       = COALESCE(r.servico_preco, s.preco)
 WHERE r.servico_tipo IS NULL;
