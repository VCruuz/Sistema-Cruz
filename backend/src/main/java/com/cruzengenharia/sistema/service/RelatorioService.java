package com.cruzengenharia.sistema.service;

// --- SERVICE: RELATÓRIO + GERAÇÃO DE PDF (iText 5) ---

import com.cruzengenharia.sistema.dto.RelatorioRequestDTO;
import com.cruzengenharia.sistema.model.Cliente;
import com.cruzengenharia.sistema.model.Relatorio;
import com.cruzengenharia.sistema.model.Servico;
import com.cruzengenharia.sistema.repository.RelatorioRepository;
import com.itextpdf.text.*;
import com.itextpdf.text.pdf.*;
import com.itextpdf.text.pdf.draw.LineSeparator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class RelatorioService {

    private final RelatorioRepository relatorioRepository;
    private final ServicoService servicoService;

    // --- LISTAGEM: ignora relatórios cujo serviço vinculado não existe mais ---
    public List<Relatorio> listarTodos() {
        return relatorioRepository.findAll().stream()
                .filter(r -> Objects.nonNull(r.getServico()))
                .toList();
    }

    // --- CONSULTA TOLERANTE: relatório inexistente (ou órfão) → Optional vazio, sem exceção ---
    public Optional<Relatorio> selecionarRelatorio(Long id) {
        if (id == null) return Optional.empty();
        return relatorioRepository.findById(id).filter(r -> r.getServico() != null);
    }

    // --- EXCLUIR RELATÓRIO: idempotente (relatório inexistente não gera erro) ---
    @Transactional
    public void excluirRelatorio(Long id) {
        if (id == null) return;
        relatorioRepository.excluirPorIdNativo(id);
    }

    // --- GERAR RELATÓRIO VINCULADO A UM SERVIÇO ---
    public Relatorio gerarRelatorio(RelatorioRequestDTO dto) {
        Servico servico = servicoService.buscarPorId(dto.getIdServico());

        Relatorio relatorio = Relatorio.builder()
                .servico(servico)
                .dataGeracao(LocalDate.now())
                .descricao(dto.getDescricao())
                .build();

        return relatorioRepository.save(relatorio);
    }

    // --- EXPORTAR PDF: dados do cliente + serviço + relatório ---
    // Retorna Optional vazio quando o relatório (ou seu serviço) não existe mais
    public Optional<byte[]> exportarPdf(Long idRelatorio) throws Exception {
        Optional<Relatorio> encontrado = selecionarRelatorio(idRelatorio);
        if (encontrado.isEmpty()) return Optional.empty();
        Relatorio rel = encontrado.get();
        Servico   srv = rel.getServico();

        Document doc = new Document(PageSize.A4, 50, 50, 70, 50);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PdfWriter.getInstance(doc, out);
        doc.open();

        // --- CORES E FONTES ---
        BaseColor verde      = new BaseColor(11, 79, 38);
        BaseColor cinzaClaro = new BaseColor(245, 247, 245);

        Font fTitulo = new Font(Font.FontFamily.HELVETICA, 20, Font.BOLD,   verde);
        Font fSub    = new Font(Font.FontFamily.HELVETICA, 10, Font.NORMAL, BaseColor.DARK_GRAY);
        Font fSecao  = new Font(Font.FontFamily.HELVETICA, 11, Font.BOLD,   verde);
        Font fLabel  = new Font(Font.FontFamily.HELVETICA,  9, Font.BOLD,   BaseColor.DARK_GRAY);
        Font fValor  = new Font(Font.FontFamily.HELVETICA,  9, Font.NORMAL, BaseColor.BLACK);

        // --- CABEÇALHO ---
        doc.add(new Paragraph("CRUZ ENGENHARIA", fTitulo));
        doc.add(new Paragraph("Sistema de Gestão — Relatório Técnico", fSub));
        doc.add(new Paragraph(" "));

        // --- LINHA SEPARADORA (iText 5: com.itextpdf.text.pdf.draw) ---
        LineSeparator ls = new LineSeparator(1f, 100f, verde, Element.ALIGN_CENTER, -2);
        doc.add(new Chunk(ls));
        doc.add(new Paragraph(" "));

        // --- SEÇÃO: DADOS DO RELATÓRIO ---
        doc.add(new Paragraph("Informações do Relatório", fSecao));
        doc.add(buildInfoTable(fLabel, fValor, cinzaClaro, new String[][]{
            {"Nº do Relatório", String.valueOf(rel.getIdRelatorio())},
            {"Data de Geração", rel.getDataGeracao() != null ? rel.getDataGeracao().toString() : "—"},
            {"Descrição",       rel.getDescricao()}
        }));
        doc.add(new Paragraph(" "));

        // --- SEÇÃO: DADOS DO CLIENTE ---
        doc.add(new Paragraph("Dados do Cliente", fSecao));
        // Cliente pode ser null em registros antigos órfãos (ver @NotFound em Servico)
        Cliente cli = srv.getCliente() != null ? srv.getCliente() : new Cliente();
        doc.add(buildInfoTable(fLabel, fValor, cinzaClaro, new String[][]{
            {"Nome",      cli.getNome()},
            {"Telefone",  cli.getTelefone()},
            {"E-mail",    cli.getEmail()},
            {"Endereço",  cli.getEndereco()}
        }));
        doc.add(new Paragraph(" "));

        // --- SEÇÃO: DADOS DO SERVIÇO ---
        doc.add(new Paragraph("Dados do Serviço Vinculado", fSecao));
        doc.add(buildInfoTable(fLabel, fValor, cinzaClaro, new String[][]{
            {"Nº do Serviço",  String.valueOf(srv.getIdServico())},
            {"Tipo",           srv.getTipoServico()},
            {"Status",         srv.getStatus()},
            {"Data de Início", srv.getDataInicio()   != null ? srv.getDataInicio().toString()   : "—"},
            {"Prazo de Entrega",srv.getPrazoEntrega() != null ? srv.getPrazoEntrega().toString() : "—"},
            {"Preço",          srv.getPreco()        != null ? formatarReais(srv.getPreco())    : "—"},
            {"Data de Criação",srv.getDataCriado()   != null ? srv.getDataCriado().toString()   : "—"},
            {"Descrição",      srv.getDescricao()    != null ? srv.getDescricao()               : "—"}
        }));

        doc.close();
        return Optional.of(out.toByteArray());
    }

    // --- HELPER: monta tabela de dois colunas (label | valor) ---
    private PdfPTable buildInfoTable(Font fLabel, Font fValor,
                                     BaseColor bg, String[][] rows) throws DocumentException {
        PdfPTable t = new PdfPTable(2);
        t.setWidthPercentage(100);
        t.setWidths(new float[]{2f, 5f});

        boolean alt = false;
        for (String[] row : rows) {
            BaseColor cor = alt ? bg : BaseColor.WHITE;

            PdfPCell cLabel = new PdfPCell(new Phrase(row[0], fLabel));
            cLabel.setBackgroundColor(cor);
            cLabel.setPadding(5);
            cLabel.setBorderColor(BaseColor.LIGHT_GRAY);

            PdfPCell cValor = new PdfPCell(new Phrase(row[1] != null ? row[1] : "—", fValor));
            cValor.setBackgroundColor(cor);
            cValor.setPadding(5);
            cValor.setBorderColor(BaseColor.LIGHT_GRAY);

            t.addCell(cLabel);
            t.addCell(cValor);
            alt = !alt;
        }
        return t;
    }

    // Formata BigDecimal como moeda brasileira (R$ 1.234,56)
    private static String formatarReais(java.math.BigDecimal valor) {
        return java.text.NumberFormat.getCurrencyInstance(java.util.Locale.forLanguageTag("pt-BR")).format(valor);
    }
}
