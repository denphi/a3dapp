'use strict';
/** @Utilities */
/** @class Class with util functions */
class Util {
	/**
	* Creates an unique id
	*
	* @author: denphi, denphi@denphi.com, Purdue University
	* @return {uuid} a string witb an unique  identifier
	*        props.onSelected callback funcion when an option is selected
	*/	
    static create_UUID(){
        var dt = new Date().getTime();
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = (dt + Math.random()*16)%16 | 0;
            dt = Math.floor(dt/16);
            return (c=='x' ? r :(r&0x3|0x8)).toString(16);
        });
        return uuid;
    }
	
	static tU(value, units=""){
		let val = value
		let system = "0";
		if (localStorage.getItem("system")){
			system = localStorage.getItem("system");
		}
		if (units=="length"){
			switch(system){
				case "3":
					val = value; // Inches to Inches
					break;
				case "1":
					val = value * 0.0254; // Inches to Meters
					break;
				case "0":		
				case "2":
					val = value * 25.4; // Inches to Milimiters
					break;
				case "4":
					val = value * 0.0833333; // Inches to Foot
					break;
			}
		} else if (units=="displacement"){
			switch(system){
				case "3":		
					val = value / 25.4; // Milimiters to Inches
					break;
				case "1":
					val = value / 1000; // Milimiters to Meters
					break;
				case "0":
				case "2":
					val = value; // Milimiters to Milimiters
					break;
				case "4":
					val = value / 305; // Milimiters to Foot
					break;
			}
		} else if (units=="temp"){
			switch(system){
				case "0":		
				case "1":
					val = value - 273.15; // Kelvin to Celsius
					break;
				case "2":
					val = value; // Kelvin to Kelvin
					break;
				case "3":
				case "4":
					val = ((value - 273.15) * 9/5 + 32);// Kelvin to Fahrenheit
					break;
			}
		} else if (units=="time"){
			switch(system){
				case "0":		
				case "1":
				case "2":
				case "3":
				case "4":
					val = value; // Seconds to Seconds
					break;
			}
		} else if (units=="force"){
			switch(system){
				case "0":		
				case "1":
				case "2":
					val = value; // Newton to Newton
					break;
				case "3":
				case "4":
					val = value*0.2248089431; // Newton to Pound-force
					break;
			}
		} else if (units=="pressure"){
			switch(system){
				case "0":		
				case "1":
				case "2":
					val = value; // MegaPascal to MegaPascal
					break;
				case "3":
				case "4":
					val = value / 6.895; // ~ MegaPascal to KiloPound
					break;
			}
		}
		return val;	
	}
	
	static rU(value, units=""){
		let val = value
		let system = 0;
		if (localStorage.getItem("system")){
			system = localStorage.getItem("system");
		}
		if (units=="length"){
			switch(system){
				case "3":		
					val = value; // Inches to Inches
					break;
				case "1":
					val = value * 39.3701; // Meters to Inches
					break;
				case "0":
				case "2":
					val = value / 25.4; // Milimiters to Inches  
					break;
				case "4":
					val = value * 12.00000648; // Foot to Inches
					break;
			}
		} else if (units=="temp"){
			switch(system){
				case "0":		
				case "1":
					val = value + 273.15; // Celsius to Kelvin 
					break;
				case "2":
					val = value; // Kelvin to Kelvin
					break;
				case "3":
				case "4":
					val = ((value - 32) * 5/9 + 273.15);// Fahrenheit to Kelvin 
					break;
			}
		} else if (units=="time"){
			switch(system){
				case "0":		
				case "1":
				case "2":
				case "3":
				case "4":
					val = value; // Seconds to Seconds
					break;
			}
		} else if (units=="force"){
			switch(system){
				case "0":		
				case "1":
				case "2":
					val = value; // Newton to Newton
					break;
				case "3":
				case "4":
					val = value*4.4482216; // Pound-force to Newton  
					break;
			}
		} else if (units=="pressure"){
			switch(system){
				case "0":		
				case "1":
				case "2":
					val = value; // MegaPascal to MegaPascal
					break;
				case "3":
				case "4":
					val = value * 6.895; // ~ KiloPound to MegaPascal
					break;
			}
		}
		return val;
	}
	
	static getUnit(variable){
		let units = Util.getUnits();
		let value;
		if (variable == "time"){
			value = units["time"];
		} else if (variable == "TEMP" || variable == "NT11"|| variable == "temp"){
			value = units["temp"];
		} else if (variable == "S11" || variable == "S22" || variable == "S33" || variable == "S12" || variable == "S13" || variable == "S23" || variable == "pressure"){
			value = units["pressure"];
		} else if (variable == "U1" || variable == "U2" || variable == "U3" || variable == "length" || variable == "displacement"){
			value = units["length"];
		} else {
			value = "";
		}
		return value;
	}

	static getUnits(){
		let units;
		let system = "0";
		if (typeof(Storage) !== "undefined" && localStorage.getItem("system")){
			system = localStorage.getItem("system");
		}
		switch(system){
			case "0":
				units = {
					"units" : "",
					"length" : "mm",
					"time" : "sec",
					"temp" : "C",
					"toutput" : "Celsius",
					"pressure" : "MPa"
				};
				break;
			case "1":
				units = {
					"units" : "",
					"length" : "m",
					"time" : "sec",
					"temp" : "C",
					"toutput" : "Celsius",
					"pressure" : "MPa"
				};
				break;
			case "2":
				units = {
					"units" : "",
					"length" : "mm",
					"time" : "sec",
					"temp" : "K",
					"toutput" : "Kelvin",
					"pressure" : "MPa"
				};
				break;
			case "3":
				units = {
					"units" : "",
					"length" : "in",
					"time" : "sec",
					"temp" : "F",
					"toutput" : "Fahrenheit",
					"pressure" : "Kip"
				};
				break;
			case "4":
				units = {
					"units" : "",
					"length" : "ft",
					"time" : "sec",
					"temp" : "F",
					"toutput" : "Fahrenheit",
					"displacement" : "Kip"
				};
				break;
		}
		return units;
	}
	
	static fixedVal(value, variable){
		if (variable == "TEMP" || variable == "NT11"){
			value = Util.tU(value,"temp").toFixed(2);
		} else if (variable == "S11" || variable == "S22" || variable == "S33" || variable == "S12" || variable == "S13" || variable == "S23"){
			value = Util.tU(value,"pressure").toFixed(2);
		} else if (variable == "U1" || variable == "U2" || variable == "U3"){
			value = Util.tU(value,"displacement").toFixed(2);
		} else {
			value = value.toFixed(2);
		}
		return value;
	}
}

/**
* creates a linear space between 2 points.
*
* @linspace
* @author: denphi, denphi@denphi.com, Purdue University
* @param {a} a float, minumun range point.
* @param {b} a float, maximun range point.
* @param {n} a float, number of samples.
* @return  {space} array of size n including floats between a and b
*/
function linspace(a,b,n) {
    n = Math.floor(n)
    if(n<2) { 
        return n===1?[a]:[]; 
    }
    var i;
    var space = Array(n);    
    for(i=n-1;i>=0;i--) { 
        space[i] = (i*b+(n-i-1)*a)/n; 
    }
    return space;
}

/**
* This function returns the increment in melting computed with th melting model by Greco and Maffezzoli
* Compute incremental change in crystallinity due to melting 
* @melting_GM
* @author: denphi, denphi@denphi.com, Purdue University
* @author: Eduardo Barocio, Purdue University
* @param {Kmb} a float, 
* @param {d} a float,
* @param {Tc} a float,
* @param {T} a float, initial temperature
* @param {dT} a float, delta of temperature
* @return  {dX}
*/
function melting_GM(Kmb, d, Tc, T, dT){

    
    var T_mid=T+ dT/2;
    var Melt1 = d/(1-d);
    var Melt2 = Kmb * (T_mid-Tc);
    var dX_dT = Kmb * Math.exp(-Melt2)*Math.pow(1+(d-1)*Math.exp(-Melt2),Melt1);
    var dX = dX_dT * dT;
    return dX;
}

/**
* This function returns the increment in melting computed with th melting model by Greco and Maffezzoli
* Compute incremental change in crystallinity due to melting 
* @intregral_VS
* @author: denphi, denphi@denphi.com, Purdue University
* @author: Eduardo Barocio, Purdue University
* @param {parameters} an object with all the parameters, 
* @param {t} a float,
* @param {dt} a float,
* @param {T} a float,
* @param {dT} a float,
* @return  {dI}

*/
function intregral_VS(parameters,t,dt,T,dT){
    var C1    = parameters[0];
    var C2    = parameters[1];
    var C3    = parameters[2];
    var Tg    = parameters[3];
    var Tc    = parameters[4];
    var Tmelt = parameters[5];
    var n     = parameters[6];

    // Time and temperature at the start and end of increment
    var T_mid = T+(dT/2);
    var T1 = T;
    var T2 = T1+dT;
    var t1=t;
    var t2=t1+dt;

    // Compute integral from t to t+dt
    var Term1_1 = - C2 / (T1-Tg+Tc);
    var Term1_2 = - C2 / (T2-Tg+Tc);

    var Term2_1 = - C3/(T1*Math.pow((Tmelt-T1),2));
    var Term2_2 = - C3/(T2*Math.pow((Tmelt-T1),2));

    var F_1=T1 * Math.exp(Term1_1+Term2_1)*n*(Math.pow(t1,(n-1)));
    var F_2=T2 * Math.exp(Term1_2+Term2_2)*n*(Math.pow(t2,(n-1)));

    var dI = C1*((F_1+F_2)/2)*dt;
    return dI;
}

/**
* This function returns the increment in melting computed with th melting model by Greco and Maffezzoli
* Compute incremental change in crystallinity due to melting 
* @material_card
* @author: denphi, denphi@denphi.com, Purdue University
* @author: Eduardo Barocio, Purdue University
* @param {material} string with the material id 
* @return  {card} object with the material card

*/
function material_card( material ){
    return {
        "density": {
            "type": "Constant",
            "rho": 1.27e-09
        },
        "tuning": {
            "small_val": 1e-10,
            "other_small_val": 1e-99,
            "integration_increment": 0.05
        },
        "environment": {
            "R": 8.31445
        },
        "crystallization": {
            "type": "V_S_Dual",
            "w1": 0.765,
            "w2": 0.235, //It should be 2 * w1?
            "xn1": 3.0,
            "C11": 116000000000.0,
            "C12": 11900.0,
            "C13": 32700000.0,
            "Tadd1": 218.7,
            "Tm1": 577.51,
            "xn2": 2.0,
            "C21": 47330000000000.0,
            "C22": 1045.0,
            "C23": 238650000.0,
            "Tadd2": 1.07,
            "Tm2": 599.74,
            "Tg": 373.15,
            "Xinf": 0.84,
            "CrystStr1": 0.0,
            "CrystStr2": -0.0031,
            "CrystStr3": -0.009
        },
        "melting": {
            "type": "...",
            "xkmb": 0.2701,
            "d": 1.7031,
            "Tc": 548.55
        },
        "thermal": {
            "type": "linear",
            "COND1sl": 0.0041,
            "COND1int": 0.7018,
            "COND2sl": 0.0011,
            "COND2int": 0.3913,
            "COND3sl": 0.0,
            "COND3int": 0.3768,
            "SPECHTsl": 2854300.0,
            "SPECHTint": 59228000.0,
            "XLATHEAT": 30000000000.0
        },
        "bonding": {
            "type": "...",
            "c1": 4.257614e-06,
            "E1": 68027.0,
            "XMELT": 523.15,
            "X_THRES": 0.05
        },
        "convection": {
            "air": {
                "V_1": -8.96868e-06,
                "V_2": 6.36467e-08,
                "V_3": 6.21664e-11,
                "FK_1": 0.000349201,
                "FK_2": 9.89608e-05,
                "FK_3": -4.57695e-08,
                "FK_4": 1.39744e-11,
                "Pr": 0.702
            },
            "correlation_equation_parameters": {
                "CfA": -0.0010169549,
                "CfB": 0.10586658,
                "CfN": 0.3665147,
                "CfM": 0.2,
                "TempBP": 473.15,
                "XL_SS": 18.0,
                "Temp_nfnt": 308.15,
                "g": 9.81
            }
        }
    }
}