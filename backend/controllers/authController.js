// Arquivo: backend/controllers/authController.js

const User = require('../models/User');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  const { name, email, password, role } = req.body;

  // Validação básica dos campos
  if (!name || !email || !password || !role) {
    if (req.headers['content-type'] === 'application/json') {
      return res.status(400).json({ msg: 'Todos os campos são obrigatórios' });
    } else {
      return res.render('register', {
        error: 'Todos os campos são obrigatórios',
        role: role || 'developer'
      });
    }
  }

  // Validação de email
  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  if (!emailRegex.test(email)) {
    if (req.headers['content-type'] === 'application/json') {
      return res.status(400).json({ msg: 'Email inválido' });
    } else {
      return res.render('register', {
        error: 'Email inválido',
        role: role || 'developer'
      });
    }
  }

  // Validação de senha
  if (password.length < 6) {
    if (req.headers['content-type'] === 'application/json') {
      return res.status(400).json({ msg: 'A senha deve ter pelo menos 6 caracteres' });
    } else {
      return res.render('register', {
        error: 'A senha deve ter pelo menos 6 caracteres',
        role: role || 'developer'
      });
    }
  }

  // Validação de role
  if (role !== 'developer' && role !== 'investor') {
    if (req.headers['content-type'] === 'application/json') {
      return res.status(400).json({ msg: 'Perfil inválido' });
    } else {
      return res.render('register', {
        error: 'Perfil inválido',
        role: 'developer'
      });
    }
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (req.headers['content-type'] === 'application/json') {
        return res.status(400).json({ msg: 'E-mail já registrado' });
      } else {
        return res.render('register', { error: 'E-mail já registrado', role });
      }
    }

    const user = new User({ name, email, password, role });
    await user.save();

    if (req.headers['content-type'] === 'application/json') {
      return res.status(201).json({ msg: 'Usuário registrado com sucesso' });
    } else {
      // Redirecionar para login
      return res.redirect('/login?registered=true');
    }
  } catch (err) {
    console.error('Erro de registro:', err);

    if (req.headers['content-type'] === 'application/json') {
      return res.status(500).json({ msg: 'Erro no registro', error: err.message });
    } else {
      return res.render('register', { error: 'Erro ao registrar usuário. Tente novamente.', role });
    }
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const redirect = req.query.redirect || req.session?.returnTo || '/';

  // Validação básica
  if (!email || !password) {
    if (req.headers['content-type'] === 'application/json') {
      return res.status(400).json({ msg: 'Email e senha são obrigatórios' });
    } else {
      return res.render('login', { error: 'Email e senha são obrigatórios' });
    }
  }

  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      if (req.headers['content-type'] === 'application/json') {
        return res.status(400).json({ msg: 'Credenciais inválidas' });
      } else {
        return res.render('login', { error: 'Email ou senha incorretos' });
      }
    }

    const token = jwt.sign(
      { id: user._id, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '2d' }
    );

    if (req.headers['content-type'] === 'application/json') {
      return res.json({ token, user: { id: user._id, name: user.name, role: user.role } });
    } else {
      // Configurar cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Somente HTTPS em produção
        sameSite: 'lax',
        maxAge: 2 * 24 * 60 * 60 * 1000 // 2 dias em milissegundos
      });

      // Limpar a URL de retorno da sessão, se existir
      if (req.session) {
        const returnTo = req.session.returnTo;
        delete req.session.returnTo;
        if (returnTo) {
          return res.redirect(returnTo);
        }
      }

      // Redirecionar
      return res.redirect(redirect);
    }
  } catch (err) {
    console.error('Erro de login:', err);

    if (req.headers['content-type'] === 'application/json') {
      return res.status(500).json({ msg: 'Erro no login', error: err.message });
    } else {
      return res.render('login', { error: 'Erro ao fazer login. Tente novamente.' });
    }
  }
};

exports.logout = (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
};