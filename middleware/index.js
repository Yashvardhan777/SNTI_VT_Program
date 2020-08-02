var middlewareObj = {};

middlewareObj.isNotLoggedIn = function(req, res, next){
    if(!req.isAuthenticated()){
        return next();
    }
    req.flash("error", "You are already logged in");
    res.redirect("/projects");
}

middlewareObj.isLoggedIn = function(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    req.flash("error", "You are not logged in");
    res.redirect("/");
}

middlewareObj.isNotLoggedInGuide = function(req, res, next){
    if (!req.isAuthenticated()){
        next();
    }else{
        req.flash("error", "You are already logged in");
        res.redirect("/guide/projects");
    }
}


middlewareObj.isLoggedInGuide = function(req, res, next){
    if(req.isAuthenticated()){
        return next();

    }
    req.flash("error", "You are not logged in");
    res.redirect("/guide");
}
module.exports = middlewareObj;