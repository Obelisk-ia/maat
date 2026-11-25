import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { cardProgress, nextStepText } from "@/lib/card-progress";
import { dashboardPeriods } from "@/lib/dashboard-periods";
import { formatMemberCode } from "@/lib/member-code";
import { lastVisitText, number } from "./format";
import { Stat } from "./stat";
import { VisitsChart } from "./visits-chart";

type Data = FunctionReturnType<typeof api.owners.dashboard.overview>;

const people = (count: number) => `${number.format(count)} ${count === 1 ? "cliente" : "clientes"}`;

export function Overview({ data, today, onShowCustomers, onEditCard }: {
  data: Data;
  today: string;
  onShowCustomers: () => void;
  onEditCard: () => void;
}) {
  const { current, previous, following, visitors, returned } = data;
  const period = dashboardPeriods[data.period];
  const visits = current.firstVisits + current.returnVisits;

  return (
    <>
      {data.partial && <p className="dashboard-note">Las cifras de clientes consideran solo las tarjetas más recientes.</p>}
      <dl className="dashboard-stats">
        <Stat label="Clientes nuevos" value={number.format(current.newCustomers)}
          detail={`${number.format(data.joinedToday)} hoy`}
          change={{ current: current.newCustomers, previous: previous.newCustomers, period: period.previous }} />
        <Stat label="Visitas" value={number.format(visits)}
          detail={`${number.format(current.firstVisits)} ${current.firstVisits === 1 ? "primera" : "primeras"} · ${number.format(current.returnVisits)} de regreso`}
          change={{ current: visits, previous: previous.firstVisits + previous.returnVisits, period: period.previous }} />
        <Stat label="Clientes que regresaron" value={number.format(returned)}
          detail={`de ${people(visitors)} que ${visitors === 1 ? "vino" : "vinieron"} en el periodo`} />
        <Stat label="Tasa de regreso" value={visitors ? `${Math.round((returned / visitors) * 100)}%` : "—"}
          detail={visitors ? "de quienes vinieron ya habían venido antes" : "Aún no hay visitas en el periodo"} />
        <Stat label="Premios entregados" value={number.format(current.rewards)}
          detail={`${number.format(data.withPrize)} ${data.withPrize === 1 ? "cliente con premio listo" : "clientes con premio listo"}`}
          change={{ current: current.rewards, previous: previous.rewards, period: period.previous }} />
      </dl>
      <p className="dashboard-note">
        {people(following)} {following === 1 ? "sigue" : "siguen"} tu tarjeta
      </p>

      <div className="dashboard-split">
        <section className="dashboard-panel" aria-labelledby="visits-title">
          <h2 id="visits-title">Visitas por {period.bucket}</h2>
          <p>Clientes que regresan y primeras visitas</p>
          <VisitsChart key={data.period} columns={data.chart} bucketName={period.bucket} />
        </section>

        <section className="dashboard-panel" aria-labelledby="goals-title">
          <h2 id="goals-title">Avance por premios</h2>
          <p>Quién llegó a cada uno en su tarjeta actual</p>
          {data.goals.length === 0 ? (
            <div className="dashboard-empty">
              <span>Tu tarjeta todavía no tiene premios.</span>
              <Button type="button" variant="outline" size="sm" onClick={onEditCard}>Agregar premios</Button>
            </div>
          ) : (
            <ul className="dashboard-goals">
              {data.goals.map((goal) => {
                const share = following ? goal.reached / following : 0;
                return (
                  <li key={goal.id}>
                    <div>
                      <span><b>{goal.stamps} {goal.stamps === 1 ? "sello" : "sellos"}</b> {goal.name}</span>
                      <span className="dashboard-count">{Math.round(share * 100)}% ({goal.reached}/{following})</span>
                    </div>
                    <span className="dashboard-meter" aria-hidden="true"><i style={{ width: `${share * 100}%` }} /></span>
                    <small>
                      {number.format(goal.ready)} por entregar · {number.format(goal.delivered)}{" "}
                      {goal.delivered === 1 ? "entregado" : "entregados"} en el periodo
                    </small>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="dashboard-near" aria-labelledby="near-title">
        <div className="dashboard-near-head">
          <div>
            <h2 id="near-title">Premios listos y cercanos</h2>
            <p>Quién tiene un premio listo y a quién le falta poco</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onShowCustomers}>Ver todos los clientes</Button>
        </div>
        {data.nearPrize.length === 0 ? (
          <p className="dashboard-empty">
            {following === 0 ? "Aún no tienes clientes. Comparte tu código QR para que guarden tu tarjeta." : "Configura premios en tu tarjeta para ver quién está cerca."}
          </p>
        ) : (
          <table className="dashboard-table">
            <thead>
              <tr><th scope="col">Cliente</th><th scope="col">Sellos</th><th scope="col">Siguiente o listo</th><th scope="col">Última visita</th></tr>
            </thead>
            <tbody>
              {data.nearPrize.map((customer) => {
                const { stamps, total, ready } = cardProgress(data.card, customer.stamps, customer.redeemedPrizes);
                return (
                  <tr key={customer.membershipId}>
                    <th scope="row"><strong>{customer.name}</strong><code>{formatMemberCode(customer.code)}</code></th>
                    <td data-label="Sellos"><span className="dashboard-count">{stamps}/{total}</span></td>
                    <td data-label="Premio">
                      {ready.length > 0
                        ? <span className="dashboard-chip">Listo: {ready[0].name}</span>
                        : nextStepText(data.card, stamps, customer.redeemedPrizes, "staff")}
                    </td>
                    <td data-label="Última visita">{lastVisitText(customer.lastVisitAt, today)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
