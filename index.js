require("dotenv").config()
const express = require("express");
const app = express();
const PORT = process.env.PORT;
const pgp = require('pg-promise')();
const db = pgp(`postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@localhost:5432/${process.env.DB_DATABASE}`);
const cors = require("cors");

app.use(express.json());
app.use(cors())

app.post("/obtenerEmpleadosPorRut", (req, res) => {
  const { runEmpleado } = req.body;

  const query = "SELECT pa.anio, emp.empl_rut, emp.empl_nombres || ' ' || emp.empl_ape_paterno || ' ' || emp.empl_ape_materno as nombre_completo, pa.dias_disponibles_semestre1, pa.dias_utilizados_semestre1, pa.dias_disponibles_semestre2, pa.dias_utilizados_semestre2 FROM admingestionweb.permiso_administrativo AS pa INNER JOIN admingestionweb.empleado AS emp ON emp.empl_rut = pa.run_empleado WHERE run_empleado=$1 ORDER BY pa.anio desc;"

  db.any(query, [runEmpleado])
    .then(data => {
      res.status(200).json({ msg: "Busqueda exitosa", nombreEmpleado: data[0].nombre_completo, runEmpleado: data[0].empl_rut, empleado: data });
    })
    .catch(error => {
      res.status(500).json({ error: "El rut solicitado no existe", error });
    });
});

app.put("/actualizarDiasEmpleado/:anio", (req, res) => {
  if (!req.params || !req.body) {
    return res.status(500).json({ error: "Debes enviar los valores en el body" })
  }

  const { anio } = req.params;
  const { diasPrimerSemestreDisponibles, diasPrimerSemestreUtilizados, diasSegundoSemestreDisponibles, diasSegundoSemestreUtilizados, runEmpleado } = req.body;

  if (runEmpleado == "" || runEmpleado == null) {
    return res.status(500).json({ error: "Debes ingresar el rut del empleado" })
  }

  if (parseFloat(diasPrimerSemestreDisponibles) + parseFloat(diasPrimerSemestreUtilizados) > 3 || parseFloat(diasSegundoSemestreDisponibles) + parseFloat(diasSegundoSemestreUtilizados) > 3) {
    return res.status(400).json({ error: "Los dias no pueden ser un numero mayor a 4" })
  }

  const query = "UPDATE admingestionweb.permiso_administrativo SET dias_disponibles_semestre1=$1, dias_utilizados_semestre1=$2, dias_disponibles_semestre2=$3, dias_utilizados_semestre2=$4 WHERE run_empleado=$5 AND anio=$6;"

  db.result(query, [diasPrimerSemestreDisponibles, diasPrimerSemestreUtilizados, diasPrimerSemestreUtilizados, diasSegundoSemestreUtilizados, runEmpleado, anio])
    .then(result => {
      res.status(200).json({
        msg: "Usuario actualizado",
        filasAfectadas: result.rowCount
      });
    })
    .catch(error => {
      res.status(500).json({ error: "Ha ocurrido un error", detalle: error.message });
    });
});

app.post("/agregarEmpleado", (req, res) => {
  const { anio, runEmpleado } = req.body;
  const timeElapsed = Date.now();
  const today = new Date(timeElapsed);

  if (anio > today.getFullYear()) {
    return res.status(400).json({ error: "Debes ingresar maximo al año en el que estamos" })
  }

  const query = `INSERT INTO admingestionweb.permiso_administrativo
    (empresa_id, run_empleado, anio, last_update, dias_disponibles_semestre1, dias_utilizados_semestre1, dias_disponibles_semestre2, dias_utilizados_semestre2)
    VALUES ('emp01', $1, $2, $3, 3, 0, 3, 0);`

  db.result(query, [runEmpleado, anio, today.toISOString()])
    .then(result => {
      res.status(200).json({
        msg: "Usuario agregado"
      });
    })
    .catch(error => {
      res.status(500).json({ error: "Ha ocurrido un error", detalle: error.message });
    });
});

app.listen(PORT, () => console.log(`El servidor esta corriendo en http://localhost:${PORT}`));