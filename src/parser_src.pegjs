start
= out:any

any 
= (class / pair / value) + eoi


conditions =_ cond:condition_types _ number:value _ list:(value __) *
{ 
let jsonObj = {};
jsonObj[cond] = number
jsonObj["list"] = list.map(item => item[0])
return jsonObj }

condition_types = ("conditions:"/"conditions current_turn:"/"conditions expired:")

pair 
= _ key:value ":" _ data:(value/object) _ {
let k = key;
let v = data;
let jsonObj = {};
jsonObj[k] = v;
return jsonObj;
}

// and object with properties
object
= opencurl result:(conditions/ innerpair / value ) * closecurl {

return result }

// starts with a "title" pair or a value and description of properties
// return an object key and as values
class 
= foo:pair_or_value _ content:object _
{
let k;
let jsonObj = {};
if(typeof(foo) === 'object'){
k = Object.keys(foo)[0];
jsonObj[k] = {"type":foo[k],"properties":{content}};
}
else {
k = foo;
jsonObj[k] = {"type":'none',"properties":{content}};
};

return jsonObj;
}

pair_or_value
= (foo:pair/ foo:value)


// a pair inside an object
innerpair
= _ inner:pair _ {return inner}

opencurl
= _ "{" _  

closecurl
= _"}"_ 

// a string of some type
value 
=  content:((word_sep)+) {
return content.join("")
}

word_sep
= content:(word sep) {
return content.join("")
}

word
= word:([A-Za-z0-9\-\+,*]+) {return word.join("")}

//optional separator
sep
= [ _]?

// optional whitespace
_  = [ \t\r\n]*

// mandatory whitespace
__ = [ \t\r\n]+

eoi = "#" + counter:[0-9]+ _ {return {"counter":counter}}