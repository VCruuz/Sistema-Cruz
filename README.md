# Sistema de Gestão — Cruz Engenharia

## Stack
| Camada    | Tecnologia                              |
|-----------|-----------------------------------------|
| Frontend  | React 18.2 · Vite 5 · Tailwind CSS 3.4 |
| Backend   | Java 17 · Spring Boot 3.2.4            |
| Banco     | MySQL 8.0                               |

---

## Como executar

### 1. Banco de Dados
O Spring cria o banco e as tabelas automaticamente na primeira execução.
Ajuste usuário/senha em `backend/src/main/resources/application.properties`.

```
spring.datasource.url=jdbc:mysql://localhost:3306/sistema_cruz_engenharia?createDatabaseIfNotExist=true
spring.datasource.username=root
spring.datasource.password=1234
```

### 2. Backend
```bash
cd backend
mvn spring-boot:run
# http://localhost:8080
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

---

## Login padrão
| Campo  | Valor                        |
|--------|------------------------------|
| E-mail | admin@cruzengenharia.com     |
| Senha  | admin123                     |

---

## Endpoints da API

### Clientes — `/api/clientes`
| Método | Rota                  | Descrição         |
|--------|-----------------------|-------------------|
| GET    | `/api/clientes`       | Listar todos      |
| GET    | `/api/clientes/{id}`  | Buscar por ID     |
| POST   | `/api/clientes`       | Cadastrar         |
| PUT    | `/api/clientes/{id}`  | Editar            |
| DELETE | `/api/clientes/{id}`  | Excluir           |

### Serviços — `/api/servicos`
| Método | Rota                                          | Descrição                        |
|--------|-----------------------------------------------|----------------------------------|
| GET    | `/api/servicos`                               | Listar todos                     |
| GET    | `/api/servicos/{id}`                          | Buscar por ID                    |
| GET    | `/api/servicos/{id}/acompanhar`               | Acompanhar (busca + contexto)    |
| POST   | `/api/servicos`                               | Cadastrar (status → Em Análise)  |
| PUT    | `/api/servicos/{id}`                          | Editar + transição de status     |
| PUT    | `/api/servicos/{id}/remarcar?novaData=YYYY-MM-DD` | Remarcar (Concluído → Remarcado) |
| POST   | `/api/servicos/{id}/vinculado`                | Gerar serviço derivado vinculado |
| DELETE | `/api/servicos/{id}`                          | Excluir                          |

**Body de criação/edição (ServicoRequestDTO):**
```json
{
  "idCliente": 1,
  "tipoServico": "Laudo Técnico",
  "descricao": "Laudo de vistoria predial",
  "dataServico": "2026-10-15",
  "status": "Em Progresso"
}
```

### Usuários — `/api/usuarios`
| Método | Rota                      | Descrição        |
|--------|---------------------------|------------------|
| POST   | `/api/usuarios/login`     | Login            |
| POST   | `/api/usuarios/logout`    | Logout simbólico |
| POST   | `/api/usuarios/cadastrar` | Cadastrar        |

### Relatórios — `/api/relatorios`
| Método | Rota                        | Descrição              |
|--------|-----------------------------|------------------------|
| GET    | `/api/relatorios`           | Listar todos           |
| GET    | `/api/relatorios/{id}`      | Buscar por ID          |
| POST   | `/api/relatorios/gerar`     | Gerar relatório        |
| GET    | `/api/relatorios/{id}/pdf`  | Exportar PDF           |

**Body de geração (RelatorioRequestDTO):**
```json
{
  "idServico": 1,
  "descricao": "Relatório de vistoria — Setembro 2026"
}
```

---

## Máquina de Estados — Serviço

```
[Cadastro] ──────────────────────► Em Análise
Em Análise   ──► Aprovar   ──────► Em Progresso
Em Análise   ──► Reprovar  ──────► Cancelado
Em Progresso ──► Concluir  ──────► Concluído
Em Progresso ──► Devolver  ──────► Em Análise
Concluído    ──► Remarcar  ──────► Remarcado
Remarcado    ──► Aprovar   ──────► Em Progresso
Remarcado    ──► Reprovar  ──────► Cancelado
```

---

## Regras de negócio
- Todo **Serviço** deve estar vinculado a exatamente 1 **Cliente**.
- Todo **Relatório** deve estar vinculado a exatamente 1 **Serviço** (e consequentemente a 1 Cliente).
- Datas de serviço não podem ser retroativas (`@FutureOrPresent` no DTO).
- Telefone: formato `(XX) XXXXX-XXXX` ou `(XX) XXXX-XXXX` — validado no frontend e backend.
- Transições de status inválidas são rejeitadas com HTTP 400 e mensagem descritiva.
