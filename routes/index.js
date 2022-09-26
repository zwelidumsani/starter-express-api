var nodemailer = require('nodemailer');
const path = require('path');
const express = require('express')
const router = express.Router()
var Cart = require('../models/cart.js');
var Product = require('../models/product')
var lib = require('../lib/library')
var Order = require('../models/order')
var User = require('../models/user')
var passport = require('passport');
var clientOrder = {};
var proId;

const accountSid = 'AC3c506767f08d7269912cf174bce0b68d'; 
const authToken = '896a17370c28d4a7c7472ea01d119b6f'; 
const client = require('twilio')(accountSid, authToken);

router.get('/', (req, res) => {
	 var productsArray = [];
	 const accRemoval = req.flash('acc-removal')[0]; 
     Product.find({category: 'Treatment'}, function(err, products){	
	     products.forEach(function(product){
			 var summaryArray = product.summary.split(',');
			 var productObject = {
				 id: product._id,
				 title:product.title,
				 summary:summaryArray,
				 image:product.imagePath
			}
			productsArray.push(productObject);			
		 });
		 
		 res.render('index', {products: productsArray, accRemoval: accRemoval});
	});		
});



router.get('/logout', isLoggedIn, function(req, res, next){
	req.session.cart=null;
    req.logout();
	res.redirect('/');
});


router.get('/dashboard', isLoggedIn, function(req, res, next){
	
	var userid;
	var orderDeleted;
	if(req.user.email == '78127625' || req.user.email == '76317345' || req.user.email == '76791635' ){
    Order.find(function(err, orders){		
	if (err){
		return res.write('Error');
		}
	var cart; 
	var totalProducts = 0;
	orders.forEach(function(order){
	cart = new Cart(order.cart);
	
	order.items = cart.generateArray();
	totalProducts = totalProducts + order.cart.totalQty;
	});
 	
	orderDeleted = req.flash('order_success_delete')[0];
	orderNotClosed = req.flash('error-removing-order')[0];
	res.render('dashboard', {orderNotClosed: orderNotClosed, orderD: orderDeleted, idd: userid,admin:"ADMIN", idd: !userid, id:req.user._id, email:req.user.email, orderss: orders, orders: orders, totalOrders: !orders.length, totalOrders: orders.length, totalProducts:  totalProducts,  headin: "ACCOUNT AND ORDERS"});
    });
}
	 else {
	
	
    Order.find({user: req.user}, function(err, orders){	
	userid = 'Admin@admin.admin';
	if (err){
		return res.write('Error');
		}
	var cart;
	var totalProducts = 0;
	orders.forEach(function(order){
	cart = new Cart(order.cart);
	
	order.items = cart.generateArray();
	totalProducts = totalProducts + order.cart.totalQty;
	});
	     res.render('dashboard', {idd: userid,admin:"USER", idd: !userid, id:req.user._id, email:req.user.email, orders: orders, totalOrders: !orders.length, totalOrders: orders.length, totalProducts:  totalProducts,  headin: "ACCOUNT AND ORDERS"});
    });
	}
	

});


router.get('/remove-account', isLoggedIn, function(req, res, next){ 
	
		 Order.deleteMany({user: req.user}, function(err){
			 if(err){
				 console.log("Could not delete Orders.");
			 } else {
				 User.findOneAndRemove({_id: req.user}, function(err,docs){
					 if(err){
						 console.log("Could not remove User!");
					 }else {
						 console.log("Account removed successfully.");
						 req.flash('acc-removal', 'You have successfully Deleted your account.');
						 res.redirect('/');
					 }
				 });
			 }
		 });
});


router.get('/checkout',isLoggedIn, function(req, res, next){
	var aff_errors = req.flash('aff_error')[0];
	var phoneErr = req.flash('cellErr')[0];
	var orderSuccess = req.flash('order_success')[0];
	
	var noError = req.flash('errro')[0];
	
      if(!req.session.cart){
		return res.render('checkout', {csrfToken: req.csrfToken(), noError: noError, noError: !noError,
	 headin: 'Checkout',
	 NoErr: !phoneErr,
	 err: phoneErr,
	 orderSuccess:!orderSuccess,
	 orderSuccess:orderSuccess,
	 affErr:!aff_errors,
	 affErr:aff_errors
	 });
	}
	

    var cart = Cart(req.session.cart);
	   
	 
	 
	 return res.render('checkout', {csrfToken: req.csrfToken(), total: req.session.cart.totalPrice, noError: noError, noError: !noError,
	 headin: 'Checkout',
	 NoErr: !phoneErr,
	 err: phoneErr,
	 orderSuccess:!orderSuccess,
	 orderSuccess:orderSuccess,
	 affErr:!aff_errors,
	 affErr:aff_errors});
	 
});

router.post('/order',isLoggedIn, function(req, res, next){
	
		if(!req.session.cart){
		    return res.render('shopping-cart');
		}
		
		
		if (!lib.isValidCellNumber(req.body.phone)){
		req.flash('cellErr', 'Invalid phone number');
		return res.redirect('/checkout');
		}
        var localTime = new Date();
	
		var cart = new Cart(req.session.cart);
	         clientOrder = new Order({
		     user: req.user,
		     cart: cart,
		     name: req.body.name,
		     phone: req.body.phone, 
		     address: req.body.address,
		     country: req.body.country,
			 statusCss:"label label-info",
			 status: "Pending...",
			 createdAt: localTime.toLocaleString()
	    }); 
		
		clientOrder.save(function(err, doc){
		    completeCellNumber = '+268'+req.body.phone;
			console.log(completeCellNumber);
			if(err){
				 console.log("Could not save order",err.message);
			}else {
				 req.session.cart = null;
				 req.flash('order_success', 'Order saved successfully.')
				 
		         client.messages
                 .create({
                     body: 'Eswatini Herbal Nutrition: Your order is being prepared. ~Thank You.',
                     from: '+13103599135',
                     to: completeCellNumber.toString()
					 
                })
                 .then(message => console.log(message.sid));
				 res.redirect('/checkout'); 
			}
		});
		
});
	
	
router.get('/remove-order/:id', isLoggedIn, function(req, res, next){
	console.log(req.params.id);
	Order.findById(req.params.id, function(err, order){
		if(err){
			console.log("Could not find Order", err.message);
		}else {
			if(order.status == "Closed"){
				 order.remove()
	             .then(data => {
		         req.flash('order_success_delete','An order has been processed and removed');
		         return res.redirect('/dashboard');
	           })
	             .catch(err => {
		             return res.json({
			         confirmation: 'fail',
			         message:err.message
		            });
	            })
			}else {
				 req.flash('error-removing-order', 'Order Error');
				 return res.redirect("/dashboard");
			}
		}
	});	
});


router.get('/close-order/:id', isLoggedIn, function(req, res, next){
	 var orderId = req.params.id;
	 Order.findOneAndUpdate({_id: orderId}, {statusCss: "label", status:"Closed"}, {new: false}, function(err, update){
		 if(err){
			 console.log("Update failed", err.message);
		 }else{
			 console.log("Order has been closed.");
			 return res.redirect('/dashboard');
		 }
	 });
});

router.get('/stock', function(req, res, next){
	 req.session.listingUrl = '/stock';
	 Product.find(function(err, docs){
		 return res.render('listing', {title: 'Shopping Cart',headin: "AVAILABLE STOCK", products: docs});
	 });
});

router.get('/treatment', function(req, res, next){
	 req.session.listingUrl = '/treatment';
	 Product.find({category: 'Treatment'}, function(err, docs){
		 return res.render('listing', {title: 'Shopping Cart',headin: "HERBAL NUTRITION",products: docs, 
		 herbalNutritionStatus: "active", downloadRoute: "view-timbita", download: "VIEW & DOWNLOAD CATALOGUE"});
	 });
});

router.get('/relations', function(req, res, next){
	 req.session.listingUrl = '/relations';
	 Product.find({category: 'Relations'}, function(err, docs){
	 var affection;	 
		 return res.render('listing', {title: 'Shopping Cart',headin: "LOVE & ATTRACTION",products: docs, affection:affection, affection:!affection,
		 loveAffectionStatus: "active", downloadRoute: "view-relations", download: "VIEW & DOWNLOAD CATALOGUE"});
	 });
});

router.get('/wealth', function(req, res, next){
	 req.session.listingUrl = '/wealth';
	 Product.find({category: 'Wealth'}, function(err, docs){
		 return res.render('listing', {title: 'Shopping Cart',headin: "WEALTH & SUCCESS",products: docs, wealthSuccessStatus:"active",
		 downloadRoute: "view-wealth", download: "VIEW & DOWNLOAD CATALOGUE"});
	 });
});


router.get('/product-d/:id', (req, res) => {
    proId = req.params.id;
     res.redirect('/product-details');	
});

router.get('/product-details', (req, res) => {
     req.session.listingUrl  = '/product-details';
	Product.findById(proId, function(err, doc){
		if(err){console.log("Error finding a Product", err.message);}
		if(!doc){
			console.log("Product unavailable");
			return res.redirect('/');
		}else { 
			 var descArray = doc.solution.split(',');
			 return res.render("pDescription", {headin: "Product Details", product: doc, descArray: descArray});
		}
	});	
});


router.get('/contact', function(req, res){
	var emailSuccess = req.flash("email_success")[0];
	var emailError = req.flash("email_error")[0];
    res.render('contactUs', {csrfToken: req.csrfToken(), emailError: emailError, emailSuccess: emailSuccess, headin: "SEND US A MESSAGE"});
});	

router.get('/about-us', function(req, res){
    res.render('about-us.handlebars', {csrfToken: req.csrfToken(), headin: "ABOUT US"});
});


router.get('/traditional-doctors', function(req, res){
    res.render('traditional-doctors', {headin: "TRADITIONAL DOCTORS"});
})


router.get('/t-contact', function(req, res){
	var message = 1;
    res.render('traditional-doctors', {headin: "TRADITIONAL DOCTORS", message: message});
})

router.post('/email', function(req, res){
	
var transporter = nodemailer.createTransport({
    host: 'mail.icon.co.sz',
    secure: true, // true for 465, false for other ports
    auth: {
      user: 'tech@icon.co.sz', // your domain email address
      pass: 'iconeswatini@2022' // your password
    }
  });
	
    const mailOptions = {
         from: req.body.email, // sender address
         to: 'tech@icon.co.sz', // list of receivers
         subject: 'Client Mail', // Subject line
         html: '<p>'+req.body.message+'</p>'// plain text body
    };

	transporter.sendMail(mailOptions, function (err, info) {
		
		if(err){ 
		     console.log("Error sending email", err.message);
		     req.flash("email_error", "Something went wrong");	
		     return res.redirect('/contact');
		}else{
		     console.log("Email has been sent");
		     req.flash("email_success", "Email sent successfully");			 
		     console.log(info);
		     return res.redirect('/contact'); 
		}
    });
});



router.get('/add-to-cart/:id', function(req, res,){
	
		 var productId = req.params.id;
	     var cart = new Cart(req.session.cart ? req.session.cart: {});
			
		 Product.findById(productId, function(err, product){
			if (err){
			   return res.redirect('/');
			}
			cart.add(product, product.id);
			req.session.cart = cart;
			var listingUrl = req.session.listingUrl;
			req.session.listingUrl = null;
			return res.redirect(listingUrl);  
	    });

});


router.get('/reduce/:id', function(req, res, next){
						
			var productId = req.params.id;
			var cart = new Cart(req.session.cart ? req.session.cart: {})
			
			cart.reduceByOne(productId);
			req.session.cart = cart;
			res.redirect('/shopping-cart');		
});

router.get('/remove/:id', function(req, res, next){
			var productId = req.params.id;
			var cart = new Cart(req.session.cart ? req.session.cart: {})
			
			cart.removeItem(productId);
			req.session.cart = cart;
			res.redirect('/shopping-cart');
});



router.get('/shopping-cart', function(req, res, next){
	var orderSuccess = req.flash('order_success')[0];
	
	    if(!req.session.cart){
		return res.render('shopping-cart', {products: null, headin: 'No Items In Cart'});
	}
	
		
		var cart = new Cart(req.session.cart);
		
		return res.render('shopping-cart', {products: cart.generateArray(),
	    totalPrice: cart.totalPrice, orderSuccess:!orderSuccess, orderSuccess:orderSuccess, headin: 'Shopping  Cart Items'});
	
});


router.get('/signup', function(req, res, next){
	 var messages = req.flash('error');
     res.render('signup', {csrfToken: req.csrfToken(), headin: "CREATE AN ACCOUNT", messages: messages, hasErrors: messages.length > 0});
});

 
router.post('/signup',passport.authenticate('strategy', {
	 failureRedirect:'/signup',
	 failureFlash: true
    }), function(req, res,next){
		req.session.sessionUser = req.user
		if(req.session.oldUrl){
			 var oldUrl = req.session.oldUrl
			 req.session.oldUrl = null;
			 res.redirect(oldUrl);
		}else {
			res.redirect('/dashboard');
		}
	}   
);

router.get('/signin', function(req, res, next){
	 var messages = req.flash('error');
     res.render('loginn.handlebars',{csrfToken: req.csrfToken(), headin: "LOG IN", messages: messages, hasErrors: messages.length > 0});
});

router.post('/signin',passport.authenticate('local', {
	 failureRedirect:'/signin',
	 failureFlash: true
    }), function(req, res, next){
		req.session.sessionUser = req.user
		 if(req.session.oldUrl){
			 var oldUrl = req.session.oldUrl
			 req.session.oldUrl = null;
			 res.redirect(oldUrl);
			
		}else {
			res.redirect('/dashboard');
		}
	}
);
	

function isLoggedIn (req, res, next){
   if (req.isAuthenticated()) {
	   return next();
   }
     req.session.oldUrl = req.url; ///checkout
     res.redirect('/signin');
}

function isNotLoggedIn (req, res, next){
   if (!req.isAuthenticated()) {
	   return next();
   }
   res.redirect('/');
}



module.exports = router;
