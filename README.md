# 📄 Contrato Fácil

O **Contrato Fácil** é uma aplicação web moderna e segura desenvolvida para facilitar a geração e gestão de contratos. O sistema permite que professores e profissionais gerem documentos personalizados em segundos, com armazenamento seguro na nuvem e conformidade com a LGPD.

## 🚀 Funcionalidades Principais

- **Gerador de Contratos Inteligente**: Crie contratos personalizados preenchendo campos simples. Exportação direta para Word e PDF.
- **Sincronização na Nuvem (Supabase)**: Seus dados e contratos são salvos de forma segura e acessíveis de qualquer dispositivo.
- **Autenticação Segura**: Login via E-mail/Senha e integração com **Google Auth**.
- **Gestão de Alunos**: Cadastro e histórico completo de documentos gerados para cada aluno.
- **Design Responsivo**: Experiência otimizada para Desktop, Tablets e Smartphones.
- **Conformidade LGPD**: Funções de privacidade, incluindo a exclusão completa de dados do usuário ("Direito ao Esquecimento").

## 🛠️ Tecnologias Utilizadas

- **Frontend**: HTML5, Vanilla JavaScript (SPA Architecture), CSS3 (Modern UI/UX).
- **Tooling**: [Vite](https://vitejs.dev/) para um desenvolvimento ultra-rápido.
- **Backend & Auth**: [Supabase](https://supabase.com/) (PostgreSQL + GoTrue).
- **Processamento de Documentos**: Docxtemplater, PizZip e File-saver.

## 🔒 Segurança e Privacidade

- **Proteção Local**: Sistema de bloqueio de sessão para uso em computadores compartilhados.
- **Variáveis de Ambiente**: Chaves de API protegidas e nunca expostas publicamente.
- **Banco de Dados Relacional**: Integridade de dados garantida com PostgreSQL.

## 📦 Como rodar o projeto localmente

1. Clone o repositório:
   ```bash
   git clone https://github.com/gabrielfil09-lab/contrato-facil.git
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Configure suas variáveis de ambiente no arquivo `.env`:
   ```env
   VITE_SUPABASE_URL=sua_url_do_supabase
   VITE_SUPABASE_ANON_KEY=sua_chave_anonima
   ```
4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

---
Desenvolvido com foco em eficiência e segurança.
