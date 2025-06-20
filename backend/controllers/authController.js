const User = require('../models/User');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  const { name, email, password, role } = req.body;

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
      //redireciona para login
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
  const redirect = req.query.redirect || '/';

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
      //configuração de cookie
      res.cookie('token', token, {
        httpOnly: true,
        maxAge: 2 * 24 * 60 * 60 * 1000
      });
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
  if (req.headers['content-type'] === 'application/json') {
    //chamada via API
    return res.json({ success: true, message: 'Logout realizado com sucesso' });
  } else {
    return res.redirect('/login');
  }
};
