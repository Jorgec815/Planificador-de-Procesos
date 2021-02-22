
//Crea la tabla inicial donde el usuario ingresa los datos

function crearTablaDatos(){
    document.getElementById("btnFIFO").style.display = "block"
    document.getElementById("btnSJF").style.display = "block"
    document.getElementById("btnSRTF").style.display = "block"
    var table ="<table border=\"1\" align=\"center\" id=\"datos1\">";
    var filas = document.getElementById("numprocesos").value

    table+="<tr>";
    for(j=0;j<5;j++){ 
        if(j==0){
            table+="<th>Proceso</th>";
        }else if(j==1){
            table+="<th>Instante de llegada</th>";
        }else if(j==2){
            table+="<th>Duración</th>";
        }else if(j==3){
            table+="<th>Inicio Bloqueo</th>";
        }else if(j==4){
            table+="<th>Duración bloqueo</th>";
        }
    }

    for (j=0;j<filas;j++) {
        table+="<tr>"
        for(i=0;i<5;i++){
            if(i==0){
                table+="<td id=\""+j+","+i+"\"  value=\""+j+","+i+"\">"+(j+1)+"</td>"
            }else{
                table+="<td><input type=\"number\" id=\""+j+","+i+"\" min=\"0\" max=\"20\"  value=\"0\"></td>"
            }
            
        }
        table+="</tr>"
    }

    table+="</tr></table>";

    document.getElementById("datos").innerHTML=table;
}

/* -------------------------------------------------------------------------------------------------------- */


//Valida que la información de los datos sea congruente
function validar(opcion){
    var procesos = document.getElementById("numprocesos").value
    var matriz = new Array(procesos)
    var aux = new Array(5)
    var bien = true

    for(i=0;i<procesos;i++){
        aux = [0,0,0,0,0]
        for(j=0;j<5;j++){
            if(j==0){
                aux[j] = document.getElementById(i+","+j).innerHTML
            }else{
                aux[j] = document.getElementById(i+","+j).value
            }
            
        }
        matriz[i] = aux;
    }

    for(i=0;i<procesos;i++){
        if(parseInt(matriz[i][3],10)>= parseInt(matriz[i][2],10)){
            alert("Error de datos, por favor verifique Proceso: "+ (i+1))
            bien = false;
            break
        }
    }


    for(i=0;i<procesos;i++){
        if(parseInt(matriz[i][3],10)==0){
            matriz[i][3] = -1
        }
    }

    if(bien==true){
        if(opcion==1){
            graficaFIFO(matriz, procesos);
        }else if(opcion == 2){
            graficaSJF(matriz, procesos);
        }else if(opcion ==3){
            graficaSRTF(matriz, procesos)
        }
    }
}

//Lógica para el primer algoritmo de planificación

//Clase y estados del proceso

const SININICIAR = 0;
const EJECUTANDOSE = 1;
const BLOQUEADO = 2;
const ESPERANDO = 3;
const FINALIZADO = 4

class Proceso{
    constructor(id, llegada, duracion, inicioBloqueo, bloqueo){
        this.id = id;
        this.llegada = llegada
        this.llegadaBackup = llegada
        this.duracion = duracion
        this.duracionBackup = duracion
        this.inicioBloqueo = inicioBloqueo
        this.bloqueo = bloqueo
        this.estado = SININICIAR;
    }

    getEstado(){
        return this.estado
    }

    setEstado(estado){
        this.estado = estado
    }
    
    anularBloqueo(){
        this.inicioBloqueo=-1
    }

    getId(){
        return this.id
    }

    getLlegada(){
        return this.llegada
    }

    getLlegadaBackup(){
        return this.llegadaBackup
    }

    avanzarLLegada(){
        this.llegada-=1
    }

    avanzarInicioBloqueo(){
        this.inicioBloqueo-=1
    }

    avanzarBloqueo(){
        this.bloqueo -=1
    }

    avanzarDuracion(){
        this.duracion-=1
    }

    getDuracion(){
        return this.duracion
    }

    getDuracionBackup(){
        return this.duracionBackup
    }

    getInicioBloqueo(){
        return this.inicioBloqueo
    }

    getBloqueo(){
        return this.bloqueo
    }
}

function graficaFIFO(matriz, procesos){
    var colaProcesos = new Array(procesos)
    
    //arreglos para los resultados
    var finalizacion = new Array()
    var retornos = new Array()
    var tiempoPerdido = new Array()
    var tiempoEspera = new Array()
    var penalidad = new Array()
    var tiempoRespuesta = new Array();
    var ejecutado = new Array() //permite saber si un proceso ya se ejecutó al menos una vez para así guardar el tiempo de respuesta
    var resultados = new Array(7)

    for(i = 0;i<procesos;i++){
        tiempoEspera[i] = 0
        ejecutado[i] = 0
        tiempoRespuesta[i] = 0
    }

    for(i=0; i<7;i++){
        resultados[i] = 0
    }

    for(i = 0; i<procesos; i++){
        colaProcesos[i] = new Proceso(parseInt(matriz[i][0],10),parseInt(matriz[i][1],10), parseInt(matriz[i][2],10),parseInt(matriz[i][3],10), parseInt(matriz[i][4],10))
    }
    //Ordena mediante método de la burbuja

    colaProcesos = ordenarLlegada(colaProcesos)
    

    //Crea la tabla para simular la gráfica

    var grafica = "<table id=\"grafica\" border=\"1\" cellpadding=\"1\" cellspacing=\"0\" align=\"center\">"

    var estados = new Array(procesos+1);

    //es cada posición del arreglo se irán agregando las celdas del proceso en cuestion, por ejemplo
    //en la posición 1 del arreglo irá la "grafica" del proceso 1, en la posición 0 se guarda lo que tenga que ver
    //con el eje horizontal

    //Eje vertical
    for(i=0;i<=procesos;i++){
        if(i==0){
            estados[i] = "<tr><td class=\"vertical\"></td>"
        }else{
            estados[i] = "<tr><td class=\"vertical\" id=\"proceso"+i+"\">"+i+"</td>"
        }
    }

    //lógica principal
    var columna = 0 //contador de las columnas para el eje horizontal
    var auxProceso; //variable axuiliar que guarda el proceso para después ponerlo al final de la cola
    var recorrido = colaProcesos.length //variable que ayuda en el recorrido de la cola, ya que se mueve un elemento al final y no es necesario evaluarlo de nuevo
    
    /* Evalua cada proceso mediate su estado, dependiendo de este va avanzando su llegada,
    su bloqueo y la duración de éstos, los cambia de estado y los manda al final de la cola
    si es necesario */
    while(colaProcesos.length!=0){
        for(i=0;i<recorrido;i++){
            if(colaProcesos[i].getEstado() == SININICIAR){
                if(colaProcesos[i].getLlegada()==0){
                    if(i==0){
                        colaProcesos[i].setEstado(EJECUTANDOSE)
                        colaProcesos[i].avanzarDuracion();
                        colaProcesos[i].avanzarInicioBloqueo();
                        estados[colaProcesos[0].getId()]+="<td class=\"ejecutandose\"></td>"
                    }else{
                        colaProcesos[i].setEstado(ESPERANDO)
                        estados[colaProcesos[i].getId()]+="<td class=\"esperando\"></td>"
                        tiempoRespuesta[colaProcesos[i].getId()-1] +=1
                    }
                }else{
                    estados[colaProcesos[i].getId()]+="<td class=\"inicioFin\"></td>"
                    colaProcesos[i].avanzarLLegada()
                }
            }else if(colaProcesos[i].getEstado()==EJECUTANDOSE){
                if(ejecutado[colaProcesos[i].getId()-1]==0){
                    ejecutado[colaProcesos[i].getId()-1]=1
                }
                if(colaProcesos[i].getDuracion()==0){
                    colaProcesos[i].setEstado(FINALIZADO)
                    finalizacion[colaProcesos[i].getId()-1] = columna
                    retornos[colaProcesos[i].getId()-1] = (columna-colaProcesos[i].getLlegadaBackup())
                    tiempoPerdido[colaProcesos[i].getId()-1] = retornos[colaProcesos[i].getId()-1] - colaProcesos[i].getDuracionBackup()
                    colaProcesos.shift();
                    i=-1
                    recorrido-=1
                }else if(colaProcesos[i].getInicioBloqueo()==0){
                    colaProcesos[i].setEstado(BLOQUEADO)
                    colaProcesos[i].avanzarBloqueo();
                    colaProcesos[i].anularBloqueo();
                    /* auxProceso = colaProcesos[0]
                    colaProcesos.shift()
                    colaProcesos.push(auxProceso) */
                    estados[colaProcesos[i].getId()]+="<td class=\"bloqueado\"></td>"
                    if(colaProcesos.length>1){
                        if(colaProcesos[i+1].getEstado()==ESPERANDO || colaProcesos[i+1].getEstado()== SININICIAR){
                            auxProceso = colaProcesos[0]
                            colaProcesos.shift();
                            colaProcesos.push(auxProceso)
                            i=-1
                            recorrido-=1
                        }
                    }
                    
                }else{
                    estados[colaProcesos[0].getId()]+="<td class=\"ejecutandose\"></td>"
                    colaProcesos[i].avanzarDuracion();
                    colaProcesos[i].avanzarInicioBloqueo();
                }
            }else if(colaProcesos[i].getEstado()==BLOQUEADO){
                if(colaProcesos[i].getBloqueo()==0){
                    if(i==0){
                        colaProcesos[i].setEstado(EJECUTANDOSE)
                        colaProcesos[i].avanzarDuracion();
                        colaProcesos[i].avanzarInicioBloqueo();
                        estados[colaProcesos[0].getId()]+="<td class=\"ejecutandose\"></td>"
                    }else{
                        colaProcesos[i].setEstado(ESPERANDO)
                        estados[colaProcesos[i].getId()]+="<td class=\"esperando\"></td>"
                    }
                }else{
                    estados[colaProcesos[i].getId()]+="<td class=\"bloqueado\"></td>"
                    colaProcesos[i].avanzarBloqueo();
                }
            }else if(colaProcesos[i].getEstado()== ESPERANDO){
                tiempoEspera[colaProcesos[i].getId()-1] +=1
                if(i==0){
                    colaProcesos[0].setEstado(EJECUTANDOSE)
                    colaProcesos[i].avanzarDuracion();
                    colaProcesos[i].avanzarInicioBloqueo();
                    estados[colaProcesos[0].getId()]+="<td class=\"ejecutandose\"></td>"

                }else{
                    estados[colaProcesos[i].getId()]+="<td class=\"esperando\"></td>"
                    if(ejecutado[colaProcesos[i].getId()-1] == 0){
                        tiempoRespuesta[colaProcesos[i].getId()-1] += 1
                    }
                }
            }
        }
        recorrido = colaProcesos.length
        estados[0]+= "<td class=\"horizontal\">"+columna+"</td>"
        columna+=1
    }   
    
    //Cierra las filas
    for(i=0;i<=procesos;i++){
        estados[i]+="</tr>"
    }

    //Cocatena todo
    for(i=procesos;i>=0;i--){
        grafica+=estados[i]
    }

    for(i=0;i<procesos;i++){
        penalidad[i] = retornos[i]/parseInt(matriz[i][2])
    }

    for(i=0;i<7;i++){
        if(i==0){
            resultados[i] = columna-1
        }else if(i==1){
            for(j=0;j<procesos;j++){
                resultados[i] += parseInt(matriz[j][2],10)
            }
        }else if(i==2){
            resultados[i] = resultados[0] - resultados[1]
        }else if(i==3){
            for(j=0;j<procesos;j++){
                resultados[i] += retornos[j]
            }
            resultados[i] = (resultados[i]/procesos)
        }else if(i==4){
            for(j=0;j<procesos;j++){
                resultados[i] += parseInt(matriz[j][2],10)
            }
            resultados[i] = (resultados[i]/procesos)
        }else if(i==5){
            for(j=0;j<procesos;j++){
                resultados[i] += tiempoEspera[j]
            }
            resultados[i] = (resultados[i]/procesos)
        }else if(i==6){
            for(j=0;j<procesos;j++){
                resultados[i] += tiempoPerdido[j]
            }
            resultados[i] = (resultados[i]/procesos)
        }
    }
    document.getElementById("grafica").innerHTML=grafica;
    graficarResultados2(procesos,finalizacion,retornos,tiempoPerdido,tiempoEspera,penalidad,tiempoRespuesta)
    graficarResultados1(resultados)

}


function graficaSJF(matriz, procesos){
    var colaProcesos = new Array(procesos)
    var colaPrioridades = new Array()

    //arreglos para los resultados
    var finalizacion = new Array()
    var retornos = new Array()
    var tiempoPerdido = new Array()
    var tiempoEspera = new Array()
    var penalidad = new Array()
    var tiempoRespuesta = new Array();
    var ejecutado = new Array() //permite saber si un proceso ya se ejecutó al menos una vez para así guardar el tiempo de respuesta
    var resultados = new Array()

    for(i = 0;i<procesos;i++){
        tiempoEspera[i] = 0
        ejecutado[i] = 0
        tiempoRespuesta[i] = 0
    }

    for(i=0; i<7;i++){
        resultados[i] = 0
    }
    for(i = 0; i<procesos; i++){
        colaProcesos[i] = new Proceso(matriz[i][0], matriz[i][1], matriz[i][2], matriz[i][3], matriz[i][4])
    }
    //Ordena mediante método de la burbuja

    colaProcesos = ordenarLlegada(colaProcesos)
    

    //Crea la tabla para simular la gráfica

    var grafica = "<table id=\"grafica\" border=\"1\" cellpadding=\"1\" cellspacing=\"0\" align=\"center\">"

    var estados = new Array(procesos+1);

    //es cada posición del arreglo se irán agregando las celdas del proceso en cuestion, por ejemplo
    //en la posición 1 del arreglo irá la "grafica" del proceso 1, en la posición 0 se guarda lo que tenga que ver
    //con el eje horizontal

    //Eje vertical
    for(i=0;i<=procesos;i++){
        if(i==0){
            estados[i] = "<tr><td class=\"vertical\"></td>"
        }else{
            estados[i] = "<tr><td class=\"vertical\" id=\"proceso"+i+"\">"+i+"</td>"
        }
    }

    //lógica principal
    var columna = 0 //contador de las columnas para el eje horizontal
    var auxProceso; //variable axuiliar que guarda el proceso para después ponerlo al final de la cola
    var finalizados = 0 //Variable de control del graficado, cuando sea igual al número de procesos detiene el graficado
    var recorrido = colaProcesos.length //variable que ayuda en el recorrido de la cola, ya que se mueve un elemento al final y no es necesario evaluarlo de nuevo
    var indice = 0
    /* Evalua cada proceso mediate su estado, dependiendo de este va avanzando su llegada,
    su bloqueo y la duración de éstos, los cambia de estado y los manda al final de la cola
    si es necesario */
    
    while(colaProcesos.length !=0){
        for(i=0;i<recorrido;i++){
            if(colaProcesos[i].getEstado() == SININICIAR){
                if(colaProcesos[i].getLlegada()==0){
                    if(i==0){
                        colaProcesos[i].setEstado(EJECUTANDOSE)
                        colaProcesos[i].avanzarDuracion();
                        colaProcesos[i].avanzarInicioBloqueo();
                        estados[colaProcesos[i].getId()]+="<td class=\"ejecutandose\"></td>"
                    }else{
                        colaProcesos[i].setEstado(ESPERANDO)
                        estados[colaProcesos[i].getId()]+="<td class=\"esperando\"></td>"
                        colaPrioridades.push(colaProcesos[i])
                        tiempoRespuesta[colaProcesos[i].getId()-1] +=1
                    }
                }else{
                    estados[colaProcesos[i].getId()]+="<td class=\"inicioFin\"></td>"
                    colaProcesos[i].avanzarLLegada()
                }
            }else if(colaProcesos[i].getEstado()==EJECUTANDOSE){
                if(ejecutado[colaProcesos[i].getId()-1]==0){
                    ejecutado[colaProcesos[i].getId()-1]=1
                }
                if(colaProcesos[i].getDuracion()==0){
                    colaProcesos[i].setEstado(FINALIZADO)
                    finalizacion[colaProcesos[i].getId()-1] = columna
                    retornos[colaProcesos[i].getId()-1] = (columna-colaProcesos[i].getLlegadaBackup())
                    tiempoPerdido[colaProcesos[i].getId()-1] = retornos[colaProcesos[i].getId()-1] - colaProcesos[i].getDuracionBackup()
                    colaProcesos.shift()
                    if(colaPrioridades.length>0){
                        indice = recuperar(colaProcesos, colaPrioridades[0])
                        auxProceso = colaProcesos[0]
                        colaProcesos[0] = colaProcesos[indice]
                        colaProcesos[indice] = auxProceso
                        colaPrioridades.shift()
                        i=-1
                        recorrido-=1
                    }else{
                        i=-1
                        recorrido-=1
                    }
                }else if(colaProcesos[i].getInicioBloqueo()==0){
                    colaProcesos[i].setEstado(BLOQUEADO)
                    colaProcesos[i].avanzarBloqueo();
                    colaProcesos[i].anularBloqueo();
                    estados[colaProcesos[i].getId()]+="<td class=\"bloqueado\"></td>"
                    if(colaPrioridades.length>0){
                        auxProceso = colaProcesos[i]
                        colaProcesos.shift()
                        colaProcesos.push(auxProceso)
                        indice = recuperar(colaProcesos, colaPrioridades[0])
                        auxProceso = colaProcesos[0]
                        colaProcesos[0] = colaProcesos[indice]
                        colaProcesos[indice] = auxProceso
                        colaPrioridades.shift()
                        i=-1
                        recorrido-=1
                    }else{
                        auxProceso = colaProcesos[i]
                        colaProcesos.shift()
                        colaProcesos.push(auxProceso)
                        i=-1
                        recorrido-=1
                    }
                }else{
                    estados[colaProcesos[i].getId()]+="<td class=\"ejecutandose\"></td>"
                    colaProcesos[i].avanzarDuracion();
                    colaProcesos[i].avanzarInicioBloqueo();
                }
            }else if(colaProcesos[i].getEstado()==BLOQUEADO){
                if(colaProcesos[i].getBloqueo()==0){
                    if(i==0){
                        colaProcesos[i].setEstado(EJECUTANDOSE)
                        colaProcesos[i].avanzarDuracion();
                        colaProcesos[i].avanzarInicioBloqueo();
                        estados[colaProcesos[i].getId()]+="<td class=\"ejecutandose\"></td>"
                    }else{
                        colaProcesos[i].setEstado(ESPERANDO)
                        estados[colaProcesos[i].getId()]+="<td class=\"esperando\"></td>"
                        colaPrioridades.push(colaProcesos[i])
                    }
                }else{
                    estados[colaProcesos[i].getId()]+="<td class=\"bloqueado\"></td>"
                    colaProcesos[i].avanzarBloqueo();
                }
            }else if(colaProcesos[i].getEstado()== ESPERANDO){
                tiempoEspera[colaProcesos[i].getId()-1] +=1
                if(i==0){
                    colaProcesos[i].setEstado(EJECUTANDOSE)
                    colaProcesos[i].avanzarDuracion();
                    colaProcesos[i].avanzarInicioBloqueo();
                    estados[colaProcesos[i].getId()]+="<td class=\"ejecutandose\"></td>"
                }else{
                    estados[colaProcesos[i].getId()]+="<td class=\"esperando\"></td>"
                    if(ejecutado[colaProcesos[i].getId()-1] == 0){
                        tiempoRespuesta[colaProcesos[i].getId()-1] += 1
                    }
                }
            }
        }
        //finalizados+=1
        colaPrioridades = ordenarDuracionSJF(colaPrioridades)
        recorrido = colaProcesos.length
        estados[0]+= "<td class=\"horizontal\">"+columna+"</td>"
        columna+=1
    }   
    
    console.log(colaProcesos)
    console.log(colaPrioridades)
    //Cierra las filas
    for(i=0;i<=procesos;i++){
        estados[i]+="</tr>"
    }

    //Cocatena todo
    for(i=procesos;i>=0;i--){
        grafica+=estados[i]
    }
    
    for(i=0;i<procesos;i++){
        penalidad[i] = retornos[i]/parseInt(matriz[i][2])
    }

    for(i=0;i<7;i++){
        if(i==0){
            resultados[i] = columna-1
        }else if(i==1){
            for(j=0;j<procesos;j++){
                resultados[i] += parseInt(matriz[j][2],10)
            }
        }else if(i==2){
            resultados[i] = resultados[0] - resultados[1]
        }else if(i==3){
            for(j=0;j<procesos;j++){
                resultados[i] += retornos[j]
            }
            resultados[i] = (resultados[i]/procesos)
        }else if(i==4){
            for(j=0;j<procesos;j++){
                resultados[i] += parseInt(matriz[j][2],10)
            }
            resultados[i] = (resultados[i]/procesos)
        }else if(i==5){
            for(j=0;j<procesos;j++){
                resultados[i] += tiempoEspera[j]
            }
            resultados[i] = (resultados[i]/procesos)
        }else if(i==6){
            for(j=0;j<procesos;j++){
                resultados[i] += tiempoPerdido[j]
            }
            resultados[i] = (resultados[i]/procesos)
        }
    }
    document.getElementById("grafica").innerHTML=grafica;
    graficarResultados2(procesos,finalizacion,retornos,tiempoPerdido,tiempoEspera,penalidad,tiempoRespuesta)
    graficarResultados1(resultados)
}

function graficaSRTF(matriz, procesos){
    var colaProcesos = new Array(procesos)
    var colaPrioridades = new Array()

    //arreglos para los resultados
    var finalizacion = new Array()
    var retornos = new Array()
    var tiempoPerdido = new Array()
    var tiempoEspera = new Array()
    var penalidad = new Array()
    var tiempoRespuesta = new Array();
    var ejecutado = new Array() //permite saber si un proceso ya se ejecutó al menos una vez para así guardar el tiempo de respuesta
    var resultados = new Array(7)

    for(i = 0;i<procesos;i++){
        tiempoEspera[i] = 0
        ejecutado[i] = 0
        tiempoRespuesta[i] = 0
    }

    for(i=0; i<7;i++){
        resultados[i] = 0
    }

    for(i = 0; i<procesos; i++){
        colaProcesos[i] = new Proceso(parseInt(matriz[i][0],10), parseInt(matriz[i][1],10), parseInt(matriz[i][2],10), parseInt(matriz[i][3],10), parseInt(matriz[i][4],10))
    }
    //Ordena mediante método de la burbuja

    colaProcesos = ordenarLlegada(colaProcesos)
    

    //Crea la tabla para simular la gráfica

    var grafica = "<table id=\"grafica\" border=\"1\" cellpadding=\"1\" cellspacing=\"0\" align=\"center\">"

    var estados = new Array(procesos+1);

    //es cada posición del arreglo se irán agregando las celdas del proceso en cuestion, por ejemplo
    //en la posición 1 del arreglo irá la "grafica" del proceso 1, en la posición 0 se guarda lo que tenga que ver
    //con el eje horizontal

    //Eje vertical
    for(i=0;i<=procesos;i++){
        if(i==0){
            estados[i] = "<tr><td class=\"vertical\"></td>"
        }else{
            estados[i] = "<tr><td class=\"vertical\" id=\"proceso"+i+"\">"+i+"</td>"
        }
    }

    //lógica principal
    var columna = 0 //contador de las columnas para el eje horizontal
    var auxProceso; //variable axuiliar que guarda el proceso para después ponerlo al final de la cola
    var recorrido = colaProcesos.length //variable que ayuda en el recorrido de la cola, ya que se mueve un elemento al final y no es necesario evaluarlo de nuevo
    var indice = 0
    /* Evalua cada proceso mediate su estado, dependiendo de este va avanzando su llegada,
    su bloqueo y la duración de éstos, los cambia de estado y los manda al final de la cola
    si es necesario */
    
    while(colaProcesos.length !=0){
        for(i=0;i<recorrido;i++){
            if(colaProcesos[i].getEstado() == SININICIAR){
                if(colaProcesos[i].getLlegada()==0){
                    if(i==0){
                        colaProcesos[i].setEstado(EJECUTANDOSE)
                        colaProcesos[i].avanzarDuracion();
                        colaProcesos[i].avanzarInicioBloqueo();
                        estados[colaProcesos[i].getId()]+="<td class=\"ejecutandose\"></td>"
                    }else{
                        colaProcesos[i].setEstado(ESPERANDO)
                        estados[colaProcesos[i].getId()]+="<td class=\"esperando\"></td>"
                        colaPrioridades.push(colaProcesos[i])
                        tiempoRespuesta[colaProcesos[i].getId()-1] +=1
                    }
                }else{
                    estados[colaProcesos[i].getId()]+="<td class=\"inicioFin\"></td>"
                    colaProcesos[i].avanzarLLegada()
                }
            }else if(colaProcesos[i].getEstado()==EJECUTANDOSE){
                if(ejecutado[colaProcesos[i].getId()-1]==0){
                    ejecutado[colaProcesos[i].getId()-1]=1
                }
                if(colaProcesos[i].getDuracion()==0){
                    colaProcesos[i].setEstado(FINALIZADO)
                    finalizacion[colaProcesos[i].getId()-1] = columna
                    retornos[colaProcesos[i].getId()-1] = (columna-colaProcesos[i].getLlegadaBackup())
                    tiempoPerdido[colaProcesos[i].getId()-1] = retornos[colaProcesos[i].getId()-1] - colaProcesos[i].getDuracionBackup()
                    colaProcesos.shift()
                    if(colaPrioridades.length>0){
                        indice = recuperar(colaProcesos, colaPrioridades[0])
                        auxProceso = colaProcesos[0]
                        colaProcesos[0] = colaProcesos[indice]
                        colaProcesos[indice] = auxProceso
                        colaPrioridades.shift()
                        i=-1
                        recorrido-=1
                    }else{
                        i=-1
                        recorrido-=1
                    }
                }else if(colaProcesos[i].getInicioBloqueo()==0){
                    colaProcesos[i].setEstado(BLOQUEADO)
                    colaProcesos[i].avanzarBloqueo();
                    colaProcesos[i].anularBloqueo();
                    estados[colaProcesos[i].getId()]+="<td class=\"bloqueado\"></td>"
                    if(colaPrioridades.length>0){
                        auxProceso = colaProcesos[i]
                        colaProcesos.shift()
                        colaProcesos.push(auxProceso)
                        indice = recuperar(colaProcesos, colaPrioridades[0])
                        auxProceso = colaProcesos[0]
                        colaProcesos[0] = colaProcesos[indice]
                        colaProcesos[indice] = auxProceso
                        colaPrioridades.shift()
                        i=-1
                        recorrido-=1
                    }else{
                        auxProceso = colaProcesos[i]
                        colaProcesos.shift()
                        colaProcesos.push(auxProceso)
                        i=-1
                        recorrido-=1
                    }
                }else{
                    estados[colaProcesos[i].getId()]+="<td class=\"ejecutandose\"></td>"
                    colaProcesos[i].avanzarDuracion();
                    colaProcesos[i].avanzarInicioBloqueo();
                }
            }else if(colaProcesos[i].getEstado()==BLOQUEADO){
                if(colaProcesos[i].getBloqueo()==0){
                    if(i==0){
                        colaProcesos[i].setEstado(EJECUTANDOSE)
                        colaProcesos[i].avanzarDuracion();
                        colaProcesos[i].avanzarInicioBloqueo();
                        estados[colaProcesos[i].getId()]+="<td class=\"ejecutandose\"></td>"
                    }else{
                        colaProcesos[i].setEstado(ESPERANDO)
                        estados[colaProcesos[i].getId()]+="<td class=\"esperando\"></td>"
                        colaPrioridades.push(colaProcesos[i])
                    }
                }else{
                    estados[colaProcesos[i].getId()]+="<td class=\"bloqueado\"></td>"
                    colaProcesos[i].avanzarBloqueo();
                }
            }else if(colaProcesos[i].getEstado()== ESPERANDO){
                tiempoEspera[colaProcesos[i].getId()-1] +=1
                if(i==0){
                    colaProcesos[i].setEstado(EJECUTANDOSE)
                    colaProcesos[i].avanzarDuracion();
                    colaProcesos[i].avanzarInicioBloqueo();
                    estados[colaProcesos[i].getId()]+="<td class=\"ejecutandose\"></td>"
                }else{
                    estados[colaProcesos[i].getId()]+="<td class=\"esperando\"></td>"
                    if(ejecutado[colaProcesos[i].getId()-1] == 0){
                        tiempoRespuesta[colaProcesos[i].getId()-1] += 1
                    }
                    tiempoEspera[colaProcesos[i].getId()-1] +=1
                }
            }
        }
        colaPrioridades = ordenarDuracionSRTF(colaPrioridades)
        recorrido = colaProcesos.length
        estados[0]+= "<td class=\"horizontal\">"+columna+"</td>"
        columna+=1
    }

    console.log(colaProcesos)
    console.log(colaPrioridades)
    //Cierra las filas
    for(i=0;i<=procesos;i++){
        estados[i]+="</tr>"
    }

    //Cocatena todo
    for(i=procesos;i>=0;i--){
        grafica+=estados[i]
    }
 
    for(i=0;i<procesos;i++){
        penalidad[i] = retornos[i]/parseInt(matriz[i][2])
    }

    for(i=0;i<7;i++){
        if(i==0){
            resultados[i] = columna-1
        }else if(i==1){
            for(j=0;j<procesos;j++){
                resultados[i] += parseInt(matriz[j][2],10)
            }
        }else if(i==2){
            resultados[i] = resultados[0] - resultados[1]
        }else if(i==3){
            for(j=0;j<procesos;j++){
                resultados[i] += retornos[j]
            }
            resultados[i] = (resultados[i]/procesos)
        }else if(i==4){
            for(j=0;j<procesos;j++){
                resultados[i] += parseInt(matriz[j][2],10)
            }
            resultados[i] = (resultados[i]/procesos)
        }else if(i==5){
            for(j=0;j<procesos;j++){
                resultados[i] += tiempoEspera[j]
            }
            resultados[i] = (resultados[i]/procesos)
        }else if(i==6){
            for(j=0;j<procesos;j++){
                resultados[i] += tiempoPerdido[j]
            }
            resultados[i] = (resultados[i]/procesos)
        }
    }
    document.getElementById("grafica").innerHTML=grafica;
    graficarResultados2(procesos,finalizacion,retornos,tiempoPerdido,tiempoEspera,penalidad,tiempoRespuesta)
    graficarResultados1(resultados)
}


function graficarResultados1(resultados){
    var table = "<table border=\"1\" align=\"center\">"

    for(i=0;i<7;i++){
        if(i==0){
            table+= "<tr><th>Tiempo Encendido</th><td>"+resultados[0]+"</td></tr>"
        }else if(i==1){
            table+= "<tr><th>Uso Total CPU</th><td>"+resultados[1]+"</td></tr>"
        }else if(i==2){
            table+= "<tr><th>CPU desocupada</th><td>"+resultados[2]+"</td></tr>"
        }else if(i==3){
            table+= "<tr><th>Promedio de Retorno</th><td>"+resultados[3]+"</td></tr>"
        }else if(i==4){
            table+= "<tr><th>Promedio de Ejecucion</th><td>"+resultados[4]+"</td></tr>"
        }else if(i==5){
            table+= "<tr><th>Promedio de Espera</th><td>"+resultados[5]+"</td></tr>"
        }else if(i==6){
            table+= "<tr><th>Promedio tiempo Perdido</th><td>"+resultados[6]+"</td></tr>"
        }
    }

    table+= "</table>"

    document.getElementById("resultados2").innerHTML= table
}

function graficarResultados2(procesos, finalizacion, retornos, tiempoPerdido, tiempoEspera, penalidad, tiempoRespuesta){

    var table = "<table border=\"1\" align=\"center\">"

    table+="<tr>";
    for(j=0;j<7;j++){ 
        if(j==0){
            table+="<th>Proceso</th>";
        }else if(j==1){
            table+="<th>Instante<bre>Fin</th>";
        }else if(j==2){
            table+="<th>Retorno</th>";
        }else if(j==3){
            table+="<th>Tiempo<br>Perdido</th>";
        }else if(j==4){
            table+="<th>Tiempo<br>espera</th>";
        }else if(j==5){
            table+="<th>Penalidad</th>";
        }else if(j==6){
            table+="<th>Tiempo<br>respuesta</th>";
        }
    }

    table+="</tr>"

    for (j=0;j<procesos;j++) {
        table+="<tr>"
        for(i=0;i<7;i++){
            if(i==0){
                table+="<td>"+(j+1)+"</td>"
            }else if(i==1){
                table+="<td>"+finalizacion[j]+"</td>"
            }else if(i==2){
                table+="<td>"+retornos[j]+"</td>"
            }else if(i==3){
                table+="<td>"+tiempoPerdido[j]+"</td>"
            }else if(i==4){
                table+="<td>"+tiempoEspera[j]+"</td>"
            }else if(i==5){
                table+="<td>"+penalidad[j]+"</td>"
            }else if(i==6){
                table+="<td>"+tiempoRespuesta[j]+"</td>"
            }
            
        }
        table+="</tr>"
    }

    table+="</tr></table>";

    document.getElementById("resultados1").innerHTML= table
}

//Método de la burbuja por llegada
function ordenarLlegada(colaProcesos){
    for(i = 0; i<colaProcesos.length-1;i++){
        for(j = 0; j<colaProcesos.length-i-1;j++){
            if(colaProcesos[j+1].getLlegada()<colaProcesos[j].getLlegada()){
                var aux = colaProcesos[j+1]
                colaProcesos[j+1] = colaProcesos[j]
                colaProcesos[j] = aux
            }
        }
    }
    return colaProcesos;
}

//Método de la burbuja por tiempo de ejecución

function ordenarDuracionSJF(colaProcesos){
    for(i = 0; i<colaProcesos.length-1;i++){
        for(j = 0; j<colaProcesos.length-i-1;j++){
            if(colaProcesos[j+1].getDuracionBackup()<colaProcesos[j].getDuracionBackup()){
                var aux = colaProcesos[j+1]
                colaProcesos[j+1] = colaProcesos[j]
                colaProcesos[j] = aux
            }
        }
    }

    if(colaProcesos.length>1){
        if(colaProcesos[0].getDuracionBackup()==colaProcesos[1].getDuracionBackup()){
            if(colaProcesos[0].getLlegadaBackup()>colaProcesos[1].getLlegadaBackup()){
                var aux = colaProcesos[0]
                colaProcesos[0] = colaProcesos[1]
                colaProcesos[1] = aux
            }
        }
    }

    return colaProcesos;
}

function ordenarDuracionSRTF(colaProcesos){
    for(i = 0; i<colaProcesos.length-1;i++){
        for(j = 0; j<colaProcesos.length-i-1;j++){
            /* console.log(colaProcesos[j+1].getDuracion())
            console.log(colaProcesos[j].getDuracion())
            console.log("-------------------")
            console.log(colaProcesos[j+1].getLlegadaBackup())
            console.log(colaProcesos[j].getLlegadaBackup()) */
            if(colaProcesos[j+1].getDuracion()===colaProcesos[j].getDuracion()){
                if(colaProcesos[j+1].getLlegadaBackup()<colaProcesos[j].getLlegadaBackup()){
                    var aux = colaProcesos[j+1]
                    colaProcesos[j+1] = colaProcesos[j]
                    colaProcesos[j] = aux
                }
            }else{
                if(colaProcesos[j+1].getDuracion()<colaProcesos[j].getDuracion()){
                    var aux = colaProcesos[j+1]
                    colaProcesos[j+1] = colaProcesos[j]
                    colaProcesos[j] = aux
                }
            }
        }
    }


    return colaProcesos;
}

function recuperar(colaProcesos, procesoSiguiente){
    for(i=0;i<colaProcesos.length;i++){
        if(colaProcesos[i] === procesoSiguiente){
            return i
        }
    }

}