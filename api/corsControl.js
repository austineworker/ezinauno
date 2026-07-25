const corsControl = (req, res, next) => { 
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.setHeader('Access-Control-Allow-Methods', 'GET', 'POST', 'OPTIONS', 'PUT', 'DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
};

module.exports = corsControl;

