# 6.2.3. Medición del avance

Para evitar calificaciones subjetivas del tipo «avance importante» o «módulo casi
terminado», el avance del proyecto se mide con el criterio que se define a
continuación, verificable por un tercero.

**Unidad de medida.** El avance se mide en **entregables verificables**, no en tareas:
funcionalidades que el usuario puede ejecutar de principio a fin, según la Tabla 1 del
anexo. «Importación de asistentes desde Excel» es un entregable; «crear el servicio de
importación» es trabajo interno y no se contabiliza por separado.

**Criterio de terminación.** Un entregable está terminado solo si cumple las cuatro
condiciones siguientes; si falla alguna, permanece en progreso:

1. Código incorporado a la rama principal del repositorio.
2. Prueba automatizada de extremo a extremo del flujo completo, en verde.
3. Procedimiento documentado en la guía de desarrollo.
4. Funcionalidad demostrable en ejecución ante el director o el cliente.

**Estados y cálculo.** Cada entregable admite tres estados —no iniciado (0 %), en
progreso (50 %) y terminado (100 %)—, sin valores intermedios, pues las estimaciones de
grano fino no admiten verificación. El avance global es el promedio de esos estados
ponderado por las semanas del sprint al que pertenece cada entregable, redondeado a la
decena más cercana. Se recalcula al cierre de cada sprint.

**Evidencia.** El cálculo se sustenta en el historial del repositorio, la salida de las
pruebas automatizadas, la bitácora de desarrollo y las actas de revisión con el
cliente. Cualquier persona puede reproducirlo a partir de esas fuentes.

**Desviaciones.** Cuando el avance difiere de lo previsto se distingue entre
**desviación de ritmo**, en la que el trabajo planificado no se completó a tiempo y
compromete la fecha de cierre, y **desviación de alcance**, en la que se ejecutó
trabajo distinto por repriorización acordada con el cliente, que reordena los sprints
sin alterar el total. Ambas se registran en la retrospectiva del sprint
correspondiente.
