-- --- SEED: USUÁRIO PADRÃO DE ACESSO ---
-- Login: admin@cruzengenharia.com / admin123
-- Usa INSERT IGNORE para não duplicar em reinicializações

INSERT IGNORE INTO usuarios (nome, email, senha)
VALUES ('Administrador', 'admin@cruzengenharia.com', 'admin123');
