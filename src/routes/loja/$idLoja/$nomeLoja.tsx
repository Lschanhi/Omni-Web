import { createFileRoute } from "@tanstack/react-router";
import { LojaPublicaPage } from "../../../pages/Loja/lojaPublicaPage";

export const Route = createFileRoute("/loja/$idLoja/$nomeLoja")({
    component: LojaRoute,
});


function LojaRoute() {
    return <LojaPublicaPage/>
}