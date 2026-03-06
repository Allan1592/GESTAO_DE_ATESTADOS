import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";

const DB_FILE = path.join(process.cwd(), "banco_dados.json");

// Função para carregar dados (Segurança: cria se não existir)
function carregarDados() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
      return [];
    }
    const data = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Erro ao carregar banco_dados.json:", error);
    return [];
  }
}

// Função para salvar dados
function salvarDados(dados: any[]) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dados, null, 2));
    return true;
  } catch (error) {
    console.error("Erro ao salvar em banco_dados.json:", error);
    return false;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes adaptadas para o sistema de arquivos JSON
  app.get("/api/records", (req, res) => {
    const { matricula, nome, data_pedido, data_envio, num_grade, tipo_atestado } = req.query;
    let db = carregarDados();

    // Filtros locais
    if (matricula) db = db.filter((r: any) => r.matricula.includes(matricula));
    if (nome) db = db.filter((r: any) => r.nome.toLowerCase().includes((nome as string).toLowerCase()));
    if (data_pedido) db = db.filter((r: any) => r.data_pedido === data_pedido);
    if (data_envio) db = db.filter((r: any) => r.data_envio === data_envio);
    if (num_grade) db = db.filter((r: any) => r.num_grade?.includes(num_grade));
    if (tipo_atestado) db = db.filter((r: any) => r.tipo_atestado === tipo_atestado);

    res.json(db.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
  });

  app.post("/api/register", (req, res) => {
    const db = carregarDados();
    const novoRegistro = {
      ...req.body,
      id: db.length > 0 ? Math.max(...db.map((r: any) => r.id)) + 1 : 1,
      status: 'ativo',
      created_at: new Date().toISOString()
    };

    db.push(novoRegistro);
    if (salvarDados(db)) {
      res.json({ id: novoRegistro.id });
    } else {
      res.status(500).json({ error: "Erro ao salvar dados" });
    }
  });

  app.patch("/api/records/:id", (req, res) => {
    const { id } = req.params;
    let db = carregarDados();
    const index = db.findIndex((r: any) => r.id === parseInt(id));

    if (index !== -1) {
      db[index] = { ...db[index], ...req.body };
      if (salvarDados(db)) {
        res.json({ success: true });
      } else {
        res.status(500).json({ error: "Erro ao salvar dados" });
      }
    } else {
      res.status(404).json({ error: "Registro não encontrado" });
    }
  });

  app.delete("/api/records/:id", (req, res) => {
    const { id } = req.params;
    let db = carregarDados();
    const initialLength = db.length;
    db = db.filter((r: any) => r.id !== parseInt(id));

    if (db.length < initialLength) {
      if (salvarDados(db)) {
        res.json({ success: true });
      } else {
        res.status(500).json({ error: "Erro ao salvar dados" });
      }
    } else {
      res.status(404).json({ error: "Registro não encontrado" });
    }
  });

  // Backup e Limpeza (já adaptados para JSON)
  app.get("/api/system/backup", (req, res) => res.json(carregarDados()));

  app.post("/api/system/import", (req, res) => {
    if (salvarDados(req.body)) {
      res.json({ success: true, count: req.body.length });
    } else {
      res.status(500).json({ error: "Erro ao importar dados" });
    }
  });

  app.delete("/api/system/clear", (req, res) => {
    if (salvarDados([])) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: "Erro ao limpar sistema" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
