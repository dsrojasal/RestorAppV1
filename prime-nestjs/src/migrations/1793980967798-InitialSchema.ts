import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1793980967798 implements MigrationInterface {
  name = 'InitialSchema1793980967798';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE "rol" ("id" SERIAL NOT NULL, "nombre" character varying(50) NOT NULL, "descripcion" character varying(200), CONSTRAINT "UQ_9792c580a992d554ee1621c5b45" UNIQUE ("nombre"), CONSTRAINT "PK_c93a22388638fac311781c7f2dd" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE TABLE "usuario" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, "email" character varying(150) NOT NULL, "password" character varying(255) NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "rolId" integer NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_2863682842e688ca198eb25c124" UNIQUE ("email"), CONSTRAINT "PK_a56c58e5cabaa04fb2c98d2d7e2" PRIMARY KEY ("id"))',
    );
    await queryRunner.query('CREATE TYPE "public"."movimiento_caja_tipo_enum" AS ENUM(\'entrada\', \'salida\')');
    await queryRunner.query(
      'CREATE TABLE "movimiento_caja" ("id" SERIAL NOT NULL, "turnoId" integer NOT NULL, "tipo" "public"."movimiento_caja_tipo_enum" NOT NULL, "monto" numeric(12,2) NOT NULL, "motivo" character varying(200) NOT NULL, "usuarioId" integer NOT NULL, "reversoDeId" integer, "fecha" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e62ca281558a262e275dc24c65a" PRIMARY KEY ("id"))',
    );
    await queryRunner.query('CREATE INDEX "IDX_MOVIMIENTO_CAJA_TURNO" ON "movimiento_caja" ("turnoId", "fecha") ');
    await queryRunner.query('CREATE TYPE "public"."turno_estado_enum" AS ENUM(\'abierto\', \'cerrado\')');
    await queryRunner.query(
      'CREATE TABLE "turno" ("id" SERIAL NOT NULL, "estado" "public"."turno_estado_enum" NOT NULL DEFAULT \'abierto\', "montoInicial" numeric(12,2) NOT NULL DEFAULT \'0\', "montoEsperado" numeric(12,2), "montoContado" numeric(12,2), "diferencia" numeric(12,2), "totalVentas" numeric(12,2) NOT NULL DEFAULT \'0\', "ventasEfectivo" numeric(12,2) NOT NULL DEFAULT \'0\', "totalEntradas" numeric(12,2) NOT NULL DEFAULT \'0\', "totalSalidas" numeric(12,2) NOT NULL DEFAULT \'0\', "totalIva" numeric(12,2) NOT NULL DEFAULT \'0\', "totalPropina" numeric(12,2) NOT NULL DEFAULT \'0\', "cantidadFacturas" integer NOT NULL DEFAULT \'0\', "resumenPagos" jsonb, "resumenMeseros" jsonb, "motivoDiferencia" character varying(300), "abiertoPorId" integer NOT NULL, "cerradoPorId" integer, "notas" character varying(300), "fechaApertura" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "fechaCierre" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_0de9cfaa37f128f7e18e73d4074" PRIMARY KEY ("id"))',
    );
    await queryRunner.query('CREATE INDEX "IDX_TURNO_APERTURA" ON "turno" ("fechaApertura") ');
    await queryRunner.query('CREATE UNIQUE INDEX "UQ_TURNO_ABIERTO" ON "turno" ("estado") WHERE "estado" = \'abierto\'');
    await queryRunner.query("CREATE TYPE \"public\".\"turno_usuario_rolturno_enum\" AS ENUM('mesero', 'cajero', 'cocinero')");
    await queryRunner.query(
      'CREATE TABLE "turno_usuario" ("id" SERIAL NOT NULL, "turnoId" integer NOT NULL, "usuarioId" integer NOT NULL, "rolTurno" "public"."turno_usuario_rolturno_enum" NOT NULL, CONSTRAINT "UQ_7c8f17535320d5763bec328e657" UNIQUE ("turnoId", "usuarioId", "rolTurno"), CONSTRAINT "PK_bb4bba643d7c539bc941dbf6679" PRIMARY KEY ("id"))',
    );
    await queryRunner.query('CREATE INDEX "IDX_TURNO_USUARIO_USUARIO" ON "turno_usuario" ("usuarioId") ');
    await queryRunner.query('CREATE INDEX "IDX_TURNO_USUARIO_TURNO" ON "turno_usuario" ("turnoId") ');
    await queryRunner.query(
      'CREATE TABLE "tipo_pago" ("id" SERIAL NOT NULL, "nombre" character varying(80) NOT NULL, CONSTRAINT "UQ_9f28c45637474e927d33b62254f" UNIQUE ("nombre"), CONSTRAINT "PK_4b11e0050c36b1df4ca2f6c588d" PRIMARY KEY ("id"))',
    );
    await queryRunner.query("CREATE TYPE \"public\".\"mesa_estado_enum\" AS ENUM('libre', 'ocupada', 'reservada', 'mantenimiento')");
    await queryRunner.query(
      'CREATE TABLE "mesa" ("id" SERIAL NOT NULL, "numero" integer NOT NULL, "capacidad" integer NOT NULL, "estado" "public"."mesa_estado_enum" NOT NULL DEFAULT \'libre\', "descripcion" character varying(200), CONSTRAINT "UQ_905ff4a07c147aea02ed9f545b3" UNIQUE ("numero"), CONSTRAINT "PK_1ddbc4791ca87a1032b5b759e99" PRIMARY KEY ("id"))',
    );
    await queryRunner.query("CREATE TYPE \"public\".\"reserva_estado_enum\" AS ENUM('pendiente', 'confirmada', 'cancelada', 'completada')");
    await queryRunner.query(
      'CREATE TABLE "reserva" ("id" SERIAL NOT NULL, "mesaId" integer NOT NULL, "usuarioId" integer NOT NULL, "nombreCliente" character varying(150) NOT NULL, "fecha" date NOT NULL, "horaInicio" TIME NOT NULL, "horaFin" TIME NOT NULL, "numPersonas" integer NOT NULL, "estado" "public"."reserva_estado_enum" NOT NULL DEFAULT \'pendiente\', "observaciones" character varying(300), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_37909c9a3ea6a72ee6f21b16129" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"movimiento_inventario_tipo_enum\" AS ENUM('reserva', 'liberacion', 'consumo', 'reabastecimiento', 'ajuste_manual')",
    );
    await queryRunner.query(
      'CREATE TABLE "movimiento_inventario" ("id" SERIAL NOT NULL, "pedidoId" bigint, "pedidoLineaId" bigint, "ingredienteId" bigint, "productoId" bigint, "tipo" "public"."movimiento_inventario_tipo_enum" NOT NULL, "cantidad" numeric(14,3) NOT NULL, "usuarioId" bigint, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_46b3c1c6a31b3b0ee001df7888e" PRIMARY KEY ("id"))',
    );
    await queryRunner.query('CREATE INDEX "IDX_MOV_INVENTARIO_FECHA" ON "movimiento_inventario" ("createdAt") ');
    await queryRunner.query('CREATE INDEX "IDX_MOV_INVENTARIO_INGREDIENTE" ON "movimiento_inventario" ("ingredienteId") ');
    await queryRunner.query('CREATE INDEX "IDX_MOV_INVENTARIO_PEDIDO" ON "movimiento_inventario" ("pedidoId") ');
    await queryRunner.query(
      'CREATE TABLE "categoria" ("id" SERIAL NOT NULL, "nombre" character varying(100) NOT NULL, "descripcion" character varying(300), "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_6771d90221138c5bf48044fd73d" UNIQUE ("nombre"), CONSTRAINT "PK_f027836b77b84fb4c3a374dc70d" PRIMARY KEY ("id"))',
    );
    await queryRunner.query("CREATE TYPE \"public\".\"producto_tipo_enum\" AS ENUM('plato', 'bebida', 'postre', 'otro')");
    await queryRunner.query(
      'CREATE TABLE "producto" ("id" SERIAL NOT NULL, "nombre" character varying(150) NOT NULL, "precio" numeric(10,2) NOT NULL, "tipo" "public"."producto_tipo_enum" NOT NULL, "stock" numeric(14,3) NOT NULL DEFAULT \'0\', "stockReservado" numeric(14,3) NOT NULL DEFAULT \'0\', "stockMinimo" numeric(14,3) NOT NULL DEFAULT \'0\', "stockMinimoUnidad" character varying(50), "isActive" boolean NOT NULL DEFAULT true, "categoriaId" integer NOT NULL, CONSTRAINT "PK_5be023b11909fe103e24c740c7d" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE TABLE "ingrediente" ("id" SERIAL NOT NULL, "nombre" character varying(150) NOT NULL, "stock" numeric(14,3) NOT NULL DEFAULT \'0\', "stockReservado" numeric(14,3) NOT NULL DEFAULT \'0\', "stockMinimo" numeric(14,3) NOT NULL DEFAULT \'0\', "stockMinimoUnidad" character varying(50), "unidad" character varying(50) NOT NULL, CONSTRAINT "UQ_1efc5aecdeb084460cbaaaa09d8" UNIQUE ("nombre"), CONSTRAINT "PK_5d2b1ec0f5d2a4cb767ac13f554" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE TABLE "producto_ingrediente" ("id" SERIAL NOT NULL, "productoId" integer NOT NULL, "ingredienteId" integer NOT NULL, "cantidad" numeric(10,3) NOT NULL DEFAULT \'1\', CONSTRAINT "UQ_ba69a97797e0e266a520f6afd9f" UNIQUE ("productoId", "ingredienteId"), CONSTRAINT "PK_8507cccdec2e21260f350b19336" PRIMARY KEY ("id"))',
    );
    await queryRunner.query('CREATE INDEX "IDX_PRODUCTO_INGREDIENTE_INGREDIENTE" ON "producto_ingrediente" ("ingredienteId") ');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"detalle_pedido_estado_enum\" AS ENUM('pendiente', 'en_preparacion', 'listo', 'entregado', 'cancelado')",
    );
    await queryRunner.query(
      'CREATE TABLE "detalle_pedido" ("id" SERIAL NOT NULL, "pedidoId" integer NOT NULL, "productoId" integer NOT NULL, "cantidad" integer NOT NULL DEFAULT \'1\', "precioUnitario" numeric(10,2) NOT NULL, "subtotal" numeric(10,2) NOT NULL, "estado" "public"."detalle_pedido_estado_enum" NOT NULL DEFAULT \'pendiente\', "observacion" character varying(300), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_123bec7ab52f5db0a11766f87c0" PRIMARY KEY ("id"))',
    );
    await queryRunner.query('CREATE INDEX "IDX_DETALLE_PEDIDO_PRODUCTO" ON "detalle_pedido" ("productoId") ');
    await queryRunner.query('CREATE INDEX "IDX_DETALLE_PEDIDO_PEDIDO" ON "detalle_pedido" ("pedidoId") ');
    await queryRunner.query(
      'CREATE TABLE "pago_factura" ("id" SERIAL NOT NULL, "facturaId" integer NOT NULL, "tipoPagoId" integer NOT NULL, "monto" numeric(12,2) NOT NULL, "fecha" TIMESTAMP WITH TIME ZONE NOT NULL, "cobradoPorId" integer, "cobradoPorRol" character varying(50), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a120b7486ee0d2e5c1f21c72669" PRIMARY KEY ("id"))',
    );
    await queryRunner.query('CREATE INDEX "IDX_PAGO_FACTURA_TIPO" ON "pago_factura" ("tipoPagoId") ');
    await queryRunner.query('CREATE INDEX "IDX_PAGO_FACTURA_FACTURA" ON "pago_factura" ("facturaId") ');
    await queryRunner.query("CREATE TYPE \"public\".\"factura_estadopago_enum\" AS ENUM('pendiente', 'pagado', 'anulado')");
    await queryRunner.query(
      'CREATE TABLE "factura" ("id" SERIAL NOT NULL, "pedidoId" integer NOT NULL, "subtotal" numeric(12,2) NOT NULL DEFAULT \'0\', "ivaPorcentaje" numeric(5,2), "iva" numeric(12,2) NOT NULL DEFAULT \'0\', "propinaPorcentaje" numeric(5,2), "propina" numeric(12,2) NOT NULL DEFAULT \'0\', "total" numeric(12,2) NOT NULL, "estadoPago" "public"."factura_estadopago_enum" NOT NULL DEFAULT \'pendiente\', "tipoPagoId" integer, "creadoPorId" integer, "cobradoPorId" integer, "cobradoPorRol" character varying(50), "fechaCobro" TIMESTAMP WITH TIME ZONE, "turnoId" integer, "cobradoSinTurno" boolean NOT NULL DEFAULT false, "autorizadoSinTurnoPorId" integer, "motivoSinTurno" character varying(300), "anuladoPorId" integer, "motivoAnulacion" character varying(300), "fechaEmision" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_7752c508f05fea9473afd6c03c1" UNIQUE ("pedidoId"), CONSTRAINT "PK_ca804984009ea42a7b46adb9a86" PRIMARY KEY ("id"))',
    );
    await queryRunner.query('CREATE INDEX "IDX_FACTURA_TURNO" ON "factura" ("turnoId") ');
    await queryRunner.query('CREATE INDEX "IDX_FACTURA_COBRO" ON "factura" ("cobradoPorId", "fechaCobro") ');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"pedido_estado_enum\" AS ENUM('pendiente', 'en_preparacion', 'listo', 'entregado', 'cancelado')",
    );
    await queryRunner.query(
      'CREATE TABLE "pedido" ("id" SERIAL NOT NULL, "mesaId" integer NOT NULL, "usuarioId" integer NOT NULL, "tipoPagoId" integer, "estado" "public"."pedido_estado_enum" NOT NULL DEFAULT \'pendiente\', "total" numeric(10,2) NOT NULL DEFAULT \'0\', "observaciones" character varying(500), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_af8d8b3d07fae559c37f56b3f43" PRIMARY KEY ("id"))',
    );
    await queryRunner.query('CREATE INDEX "IDX_PEDIDO_CREADO" ON "pedido" ("createdAt") ');
    await queryRunner.query('CREATE INDEX "IDX_PEDIDO_ESTADO" ON "pedido" ("estado") ');
    await queryRunner.query('CREATE INDEX "IDX_PEDIDO_USUARIO" ON "pedido" ("usuarioId") ');
    await queryRunner.query('CREATE INDEX "IDX_PEDIDO_MESA" ON "pedido" ("mesaId") ');
    await queryRunner.query(
      'CREATE TABLE "proveedor" ("id" SERIAL NOT NULL, "nombre" character varying(150) NOT NULL, "contacto" character varying(100), "email" character varying(150), CONSTRAINT "PK_405f60886417ece76cb5681550a" PRIMARY KEY ("id"))',
    );
    await queryRunner.query("CREATE TYPE \"public\".\"orden_compra_estado_enum\" AS ENUM('borrador', 'enviada', 'recibida', 'cancelada')");
    await queryRunner.query(
      'CREATE TABLE "orden_compra" ("id" SERIAL NOT NULL, "proveedorId" integer NOT NULL, "fecha" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "estado" "public"."orden_compra_estado_enum" NOT NULL DEFAULT \'borrador\', CONSTRAINT "PK_173f061aa56f5acd1ddfacceeb7" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE TABLE "notificacion_leida" ("notificacionId" integer NOT NULL, "usuarioId" integer NOT NULL, "leidaAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_efca6721b34df2e068fc57a5132" PRIMARY KEY ("notificacionId", "usuarioId"))',
    );
    await queryRunner.query(
      'CREATE TABLE "notificaciones" ("id" SERIAL NOT NULL, "tipo" character varying(30) NOT NULL, "mensaje" character varying(300) NOT NULL, "icono" character varying(50) NOT NULL, "clase" character varying(20) NOT NULL, "refId" character varying(50), "creadoPorId" integer, "usuarioId" integer, "paraAdministrador" boolean NOT NULL DEFAULT false, "paraMesero" boolean NOT NULL DEFAULT false, "paraChef" boolean NOT NULL DEFAULT false, "paraCajero" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a9d32a419ff58b53a38b5ef85d4" PRIMARY KEY ("id"))',
    );
    await queryRunner.query('CREATE INDEX "IDX_NOTIFICACION_CREADO" ON "notificaciones" ("createdAt") ');
    await queryRunner.query('CREATE INDEX "IDX_NOTIFICACION_USUARIO" ON "notificaciones" ("usuarioId") ');
    await queryRunner.query(
      'CREATE TABLE "entrada_stock" ("id" SERIAL NOT NULL, "productoId" integer, "ingredienteId" integer, "stockAntes" numeric(14,3) NOT NULL, "cantidad" numeric(14,3) NOT NULL, "stockDespues" numeric(14,3) NOT NULL, "usuarioId" integer NOT NULL, "fecha" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_8887e0b45de98d309d7241de1cf" PRIMARY KEY ("id"))',
    );
    await queryRunner.query('CREATE INDEX "IDX_ENTRADA_STOCK_FECHA" ON "entrada_stock" ("fecha") ');
    await queryRunner.query('CREATE INDEX "IDX_ENTRADA_STOCK_INGREDIENTE" ON "entrada_stock" ("ingredienteId") ');
    await queryRunner.query('CREATE INDEX "IDX_ENTRADA_STOCK_PRODUCTO" ON "entrada_stock" ("productoId") ');
    await queryRunner.query(
      'CREATE TABLE "detalle_orden_compra" ("id" SERIAL NOT NULL, "ordenCompraId" integer NOT NULL, "ingredienteId" integer NOT NULL, "cantidad" integer NOT NULL DEFAULT \'1\', "precioUnitario" numeric(10,2) NOT NULL DEFAULT \'0\', "subtotal" numeric(10,2) NOT NULL, CONSTRAINT "PK_fb219464cba87c5a4aac22386d1" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'ALTER TABLE "usuario" ADD CONSTRAINT "FK_611daf5befc024d9e0bd7bdf4da" FOREIGN KEY ("rolId") REFERENCES "rol"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "movimiento_caja" ADD CONSTRAINT "FK_163944c61f4d43262156c10266b" FOREIGN KEY ("turnoId") REFERENCES "turno"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "movimiento_caja" ADD CONSTRAINT "FK_abbc4c7317bbd0c665249e62095" FOREIGN KEY ("usuarioId") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "movimiento_caja" ADD CONSTRAINT "FK_9c8a8512bc438875bdb166c0cd8" FOREIGN KEY ("reversoDeId") REFERENCES "movimiento_caja"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "turno" ADD CONSTRAINT "FK_8dfd6f18864b4e910229b009c3e" FOREIGN KEY ("abiertoPorId") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "turno" ADD CONSTRAINT "FK_6b721ebd6674330952408cf40ea" FOREIGN KEY ("cerradoPorId") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "turno_usuario" ADD CONSTRAINT "FK_5ebc8d699eb28248f5e3908b9ba" FOREIGN KEY ("turnoId") REFERENCES "turno"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "turno_usuario" ADD CONSTRAINT "FK_26382624c7da7904743c219fb02" FOREIGN KEY ("usuarioId") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "reserva" ADD CONSTRAINT "FK_100077ca3abc25013915c821dee" FOREIGN KEY ("mesaId") REFERENCES "mesa"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "reserva" ADD CONSTRAINT "FK_b9efd119aa658b7553ef7667883" FOREIGN KEY ("usuarioId") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "producto" ADD CONSTRAINT "FK_6465b0476dcfd393c4808d53b95" FOREIGN KEY ("categoriaId") REFERENCES "categoria"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "producto_ingrediente" ADD CONSTRAINT "FK_ff955409d3a4a4a8b9d46f2e67d" FOREIGN KEY ("productoId") REFERENCES "producto"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "producto_ingrediente" ADD CONSTRAINT "FK_4c051b1713a66b753e1aed0dd27" FOREIGN KEY ("ingredienteId") REFERENCES "ingrediente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "detalle_pedido" ADD CONSTRAINT "FK_4d39e79d693b68f9f35cf4238e1" FOREIGN KEY ("pedidoId") REFERENCES "pedido"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "detalle_pedido" ADD CONSTRAINT "FK_aa6bb17cb0e47d62ace803293eb" FOREIGN KEY ("productoId") REFERENCES "producto"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "pago_factura" ADD CONSTRAINT "FK_29eae846e4e0d07c92d7b6c5ea4" FOREIGN KEY ("facturaId") REFERENCES "factura"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "pago_factura" ADD CONSTRAINT "FK_0cd6ba2bfd145108e14b1839f60" FOREIGN KEY ("tipoPagoId") REFERENCES "tipo_pago"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "pago_factura" ADD CONSTRAINT "FK_b8d44e3e76bbb150637c8ead3f3" FOREIGN KEY ("cobradoPorId") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "factura" ADD CONSTRAINT "FK_7752c508f05fea9473afd6c03c1" FOREIGN KEY ("pedidoId") REFERENCES "pedido"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "factura" ADD CONSTRAINT "FK_456aecef459d783b8efb45e25bf" FOREIGN KEY ("tipoPagoId") REFERENCES "tipo_pago"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "factura" ADD CONSTRAINT "FK_b1aa3456d72701e062e11253813" FOREIGN KEY ("creadoPorId") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "factura" ADD CONSTRAINT "FK_5a1675576c71577e83f30f5352c" FOREIGN KEY ("cobradoPorId") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "factura" ADD CONSTRAINT "FK_3e483bb30e2fb9028a9afc12e00" FOREIGN KEY ("turnoId") REFERENCES "turno"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "factura" ADD CONSTRAINT "FK_d1870f0b9931ab7b7fb19c423e4" FOREIGN KEY ("autorizadoSinTurnoPorId") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "factura" ADD CONSTRAINT "FK_ad7b62d56193606ca2b648020e5" FOREIGN KEY ("anuladoPorId") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "pedido" ADD CONSTRAINT "FK_3eba14db7ef6a4ddb4a726a6d28" FOREIGN KEY ("mesaId") REFERENCES "mesa"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "pedido" ADD CONSTRAINT "FK_440272d326db467ee25802678e8" FOREIGN KEY ("usuarioId") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "pedido" ADD CONSTRAINT "FK_a609506f11966a5b52f70254575" FOREIGN KEY ("tipoPagoId") REFERENCES "tipo_pago"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "orden_compra" ADD CONSTRAINT "FK_bd904a528bbc5acd9ae89b2a7b0" FOREIGN KEY ("proveedorId") REFERENCES "proveedor"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "entrada_stock" ADD CONSTRAINT "FK_e98a4944f8f1c2b20a847372fec" FOREIGN KEY ("productoId") REFERENCES "producto"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "entrada_stock" ADD CONSTRAINT "FK_7dda65f064655da36355e4cceec" FOREIGN KEY ("ingredienteId") REFERENCES "ingrediente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "entrada_stock" ADD CONSTRAINT "FK_e4d1b82f0d29786a4003dead25c" FOREIGN KEY ("usuarioId") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "detalle_orden_compra" ADD CONSTRAINT "FK_a46087c8ec7d6186dfdaa3dcaa1" FOREIGN KEY ("ordenCompraId") REFERENCES "orden_compra"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "detalle_orden_compra" ADD CONSTRAINT "FK_55736b1ddfdd3f271ca61f20cc0" FOREIGN KEY ("ingredienteId") REFERENCES "ingrediente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "detalle_orden_compra" DROP CONSTRAINT "FK_55736b1ddfdd3f271ca61f20cc0"');
    await queryRunner.query('ALTER TABLE "detalle_orden_compra" DROP CONSTRAINT "FK_a46087c8ec7d6186dfdaa3dcaa1"');
    await queryRunner.query('ALTER TABLE "entrada_stock" DROP CONSTRAINT "FK_e4d1b82f0d29786a4003dead25c"');
    await queryRunner.query('ALTER TABLE "entrada_stock" DROP CONSTRAINT "FK_7dda65f064655da36355e4cceec"');
    await queryRunner.query('ALTER TABLE "entrada_stock" DROP CONSTRAINT "FK_e98a4944f8f1c2b20a847372fec"');
    await queryRunner.query('ALTER TABLE "orden_compra" DROP CONSTRAINT "FK_bd904a528bbc5acd9ae89b2a7b0"');
    await queryRunner.query('ALTER TABLE "pedido" DROP CONSTRAINT "FK_a609506f11966a5b52f70254575"');
    await queryRunner.query('ALTER TABLE "pedido" DROP CONSTRAINT "FK_440272d326db467ee25802678e8"');
    await queryRunner.query('ALTER TABLE "pedido" DROP CONSTRAINT "FK_3eba14db7ef6a4ddb4a726a6d28"');
    await queryRunner.query('ALTER TABLE "factura" DROP CONSTRAINT "FK_ad7b62d56193606ca2b648020e5"');
    await queryRunner.query('ALTER TABLE "factura" DROP CONSTRAINT "FK_d1870f0b9931ab7b7fb19c423e4"');
    await queryRunner.query('ALTER TABLE "factura" DROP CONSTRAINT "FK_3e483bb30e2fb9028a9afc12e00"');
    await queryRunner.query('ALTER TABLE "factura" DROP CONSTRAINT "FK_5a1675576c71577e83f30f5352c"');
    await queryRunner.query('ALTER TABLE "factura" DROP CONSTRAINT "FK_b1aa3456d72701e062e11253813"');
    await queryRunner.query('ALTER TABLE "factura" DROP CONSTRAINT "FK_456aecef459d783b8efb45e25bf"');
    await queryRunner.query('ALTER TABLE "factura" DROP CONSTRAINT "FK_7752c508f05fea9473afd6c03c1"');
    await queryRunner.query('ALTER TABLE "pago_factura" DROP CONSTRAINT "FK_b8d44e3e76bbb150637c8ead3f3"');
    await queryRunner.query('ALTER TABLE "pago_factura" DROP CONSTRAINT "FK_0cd6ba2bfd145108e14b1839f60"');
    await queryRunner.query('ALTER TABLE "pago_factura" DROP CONSTRAINT "FK_29eae846e4e0d07c92d7b6c5ea4"');
    await queryRunner.query('ALTER TABLE "detalle_pedido" DROP CONSTRAINT "FK_aa6bb17cb0e47d62ace803293eb"');
    await queryRunner.query('ALTER TABLE "detalle_pedido" DROP CONSTRAINT "FK_4d39e79d693b68f9f35cf4238e1"');
    await queryRunner.query('ALTER TABLE "producto_ingrediente" DROP CONSTRAINT "FK_4c051b1713a66b753e1aed0dd27"');
    await queryRunner.query('ALTER TABLE "producto_ingrediente" DROP CONSTRAINT "FK_ff955409d3a4a4a8b9d46f2e67d"');
    await queryRunner.query('ALTER TABLE "producto" DROP CONSTRAINT "FK_6465b0476dcfd393c4808d53b95"');
    await queryRunner.query('ALTER TABLE "reserva" DROP CONSTRAINT "FK_b9efd119aa658b7553ef7667883"');
    await queryRunner.query('ALTER TABLE "reserva" DROP CONSTRAINT "FK_100077ca3abc25013915c821dee"');
    await queryRunner.query('ALTER TABLE "turno_usuario" DROP CONSTRAINT "FK_26382624c7da7904743c219fb02"');
    await queryRunner.query('ALTER TABLE "turno_usuario" DROP CONSTRAINT "FK_5ebc8d699eb28248f5e3908b9ba"');
    await queryRunner.query('ALTER TABLE "turno" DROP CONSTRAINT "FK_6b721ebd6674330952408cf40ea"');
    await queryRunner.query('ALTER TABLE "turno" DROP CONSTRAINT "FK_8dfd6f18864b4e910229b009c3e"');
    await queryRunner.query('ALTER TABLE "movimiento_caja" DROP CONSTRAINT "FK_9c8a8512bc438875bdb166c0cd8"');
    await queryRunner.query('ALTER TABLE "movimiento_caja" DROP CONSTRAINT "FK_abbc4c7317bbd0c665249e62095"');
    await queryRunner.query('ALTER TABLE "movimiento_caja" DROP CONSTRAINT "FK_163944c61f4d43262156c10266b"');
    await queryRunner.query('ALTER TABLE "usuario" DROP CONSTRAINT "FK_611daf5befc024d9e0bd7bdf4da"');
    await queryRunner.query('DROP TABLE "detalle_orden_compra"');
    await queryRunner.query('DROP INDEX "public"."IDX_ENTRADA_STOCK_PRODUCTO"');
    await queryRunner.query('DROP INDEX "public"."IDX_ENTRADA_STOCK_INGREDIENTE"');
    await queryRunner.query('DROP INDEX "public"."IDX_ENTRADA_STOCK_FECHA"');
    await queryRunner.query('DROP TABLE "entrada_stock"');
    await queryRunner.query('DROP INDEX "public"."IDX_NOTIFICACION_USUARIO"');
    await queryRunner.query('DROP INDEX "public"."IDX_NOTIFICACION_CREADO"');
    await queryRunner.query('DROP TABLE "notificaciones"');
    await queryRunner.query('DROP TABLE "notificacion_leida"');
    await queryRunner.query('DROP TABLE "orden_compra"');
    await queryRunner.query('DROP TYPE "public"."orden_compra_estado_enum"');
    await queryRunner.query('DROP TABLE "proveedor"');
    await queryRunner.query('DROP INDEX "public"."IDX_PEDIDO_MESA"');
    await queryRunner.query('DROP INDEX "public"."IDX_PEDIDO_USUARIO"');
    await queryRunner.query('DROP INDEX "public"."IDX_PEDIDO_ESTADO"');
    await queryRunner.query('DROP INDEX "public"."IDX_PEDIDO_CREADO"');
    await queryRunner.query('DROP TABLE "pedido"');
    await queryRunner.query('DROP TYPE "public"."pedido_estado_enum"');
    await queryRunner.query('DROP INDEX "public"."IDX_FACTURA_COBRO"');
    await queryRunner.query('DROP INDEX "public"."IDX_FACTURA_TURNO"');
    await queryRunner.query('DROP TABLE "factura"');
    await queryRunner.query('DROP TYPE "public"."factura_estadopago_enum"');
    await queryRunner.query('DROP INDEX "public"."IDX_PAGO_FACTURA_FACTURA"');
    await queryRunner.query('DROP INDEX "public"."IDX_PAGO_FACTURA_TIPO"');
    await queryRunner.query('DROP TABLE "pago_factura"');
    await queryRunner.query('DROP INDEX "public"."IDX_DETALLE_PEDIDO_PEDIDO"');
    await queryRunner.query('DROP INDEX "public"."IDX_DETALLE_PEDIDO_PRODUCTO"');
    await queryRunner.query('DROP TABLE "detalle_pedido"');
    await queryRunner.query('DROP TYPE "public"."detalle_pedido_estado_enum"');
    await queryRunner.query('DROP INDEX "public"."IDX_PRODUCTO_INGREDIENTE_INGREDIENTE"');
    await queryRunner.query('DROP TABLE "producto_ingrediente"');
    await queryRunner.query('DROP TABLE "ingrediente"');
    await queryRunner.query('DROP TABLE "producto"');
    await queryRunner.query('DROP TYPE "public"."producto_tipo_enum"');
    await queryRunner.query('DROP TABLE "categoria"');
    await queryRunner.query('DROP INDEX "public"."IDX_MOV_INVENTARIO_PEDIDO"');
    await queryRunner.query('DROP INDEX "public"."IDX_MOV_INVENTARIO_INGREDIENTE"');
    await queryRunner.query('DROP INDEX "public"."IDX_MOV_INVENTARIO_FECHA"');
    await queryRunner.query('DROP TABLE "movimiento_inventario"');
    await queryRunner.query('DROP TYPE "public"."movimiento_inventario_tipo_enum"');
    await queryRunner.query('DROP TABLE "reserva"');
    await queryRunner.query('DROP TYPE "public"."reserva_estado_enum"');
    await queryRunner.query('DROP TABLE "mesa"');
    await queryRunner.query('DROP TYPE "public"."mesa_estado_enum"');
    await queryRunner.query('DROP TABLE "tipo_pago"');
    await queryRunner.query('DROP INDEX "public"."IDX_TURNO_USUARIO_TURNO"');
    await queryRunner.query('DROP INDEX "public"."IDX_TURNO_USUARIO_USUARIO"');
    await queryRunner.query('DROP TABLE "turno_usuario"');
    await queryRunner.query('DROP TYPE "public"."turno_usuario_rolturno_enum"');
    await queryRunner.query('DROP INDEX "public"."UQ_TURNO_ABIERTO"');
    await queryRunner.query('DROP INDEX "public"."IDX_TURNO_APERTURA"');
    await queryRunner.query('DROP TABLE "turno"');
    await queryRunner.query('DROP TYPE "public"."turno_estado_enum"');
    await queryRunner.query('DROP INDEX "public"."IDX_MOVIMIENTO_CAJA_TURNO"');
    await queryRunner.query('DROP TABLE "movimiento_caja"');
    await queryRunner.query('DROP TYPE "public"."movimiento_caja_tipo_enum"');
    await queryRunner.query('DROP TABLE "usuario"');
    await queryRunner.query('DROP TABLE "rol"');
  }
}
