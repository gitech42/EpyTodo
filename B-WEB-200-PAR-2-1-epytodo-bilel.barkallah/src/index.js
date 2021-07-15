const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();
const router = express.Router();
const secretKey = 'secret1234'
const db = require('./config/db.js');

//middleware

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization']
    const token = authHeader
    if (token == null) return res.sendStatus(401)
    jwt.verify(token, secretKey, (err, user) => {
        if (err) return res.sendStatus(403)
        req.user = user
        next()
    })
}

router.use(bodyParser.urlencoded({ extended: false }));

router.use(bodyParser.json());

router.get('/', (req, res) => {
    res.send('test');
});

// route register

router.post('/register', (req, res) => {
    const firstname = req.body.firstname;
    const name = req.body.name;
    const email = req.body.email;
    const password = bcrypt.hashSync(req.body.password);

    db.createUser([firstname, name, email, password], (err)=>{
        if (err) {
            return res.status(500).send({"msg": "account  already  exists"});
        }
        db.findUserByEmail(email, (err, user) =>{
            if (err)
                return res.status(500).send({"msg": "internal  server  error"});
            const expiresIn = 24 * 60 * 60;
            const accessToken = jwt.sign({ id: user.id }, secretKey, {
                expiresIn: expiresIn
            });
            res.status(200).send({"token":  accessToken});
        });
    });
});

//login route

router.post('/login', (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    db.findUserByEmail(email, (err, user)=>{
        if (err)
            return res.status(500).send({"msg": "internal  server  error"});
        if (!user)
            return res.status(404).send('User not found!');
        user = user[0];
        const result = bcrypt.compareSync(password, user.password);
        if(!result)
            return res.status(401).send({"msg": "Invalid  Credentials"});

        const expiresIn  = 24 * 60 * 60;
        const accessToken = jwt.sign({ id: user.id }, secretKey, {
            expiresIn: expiresIn
        });
        res.status(200).send({"token":  accessToken});
    });
});


//user route

router.get('/user', authenticateToken, (req, res) => {
    id = req.query.id;
    email = req.query.email;
    if (!email && !id) {
        db.getUsers((err, users) => {
            if (err) return res.status(500).send({"msg": "internal  server  error"});
            res.status(200).send(users);
        });
    }
    else if (id) {
        db.findUserById(id, (err, user) => {
            if (err) return res.status(500).send({"msg": "internal  server  error"});
            if (!user[0])
                return res.status(500).send({"msg": "Not found"});
            res.status(200).send(user[0]);
        });
    }
    else if (email) {
        db.findUserByEmail(email, (err, user) => {
            if (err) return res.status(500).send({"msg": "internal  server  error"});
            if (!user[0])
                return res.status(500).send({"msg": "Not found"});
            res.status(200).send(user[0]);
        }); 
    }
});

router.get('/user/todos', authenticateToken, (req, res) => {
    db.findUserTodos(req.user, (err, todos) => {
        if (err)
            return res.status(500).send({"msg": "internal  server  error"});
        res.status(200).send(todos);
    });
});

//todo route

router.post('/todo', authenticateToken, (req, res) => {
    const title = req.body.title;
    const description = req.body.description;
    const due_time = req.body.due_time;
    const user_id = req.body.user_id;
    const id_status = req.body.status;

    db.createTodo({title, description, due_time, user_id, id_status}, (err, todo) => {
        if (err)
            return res.status(500).send({"msg": "internal  server  error"});
        res.status(200).send(todo);
    });
    
});

/// miss delete

app.use(router);

const server = app.listen(8000, () => {
    console.log('Server Started');
});
