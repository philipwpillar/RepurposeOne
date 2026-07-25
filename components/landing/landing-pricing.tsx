import Link from "next/link";
import { PLAN_LIMITS } from "@/lib/config";
import { PAID_PLAN_CATALOG, PLAN_PRICES } from "@/lib/billing/plan-catalog";

type LandingPricingProps = {
  signedIn: boolean;
};

export function LandingPricing({ signedIn }: LandingPricingProps) {
  return (
    <section className="pricing" id="pricing">
      <div className="wrap">
        <h2 className="zone-title">Simple plans. Generations, not tokens.</h2>
        <p className="pricing-sub">
          A generation is one successful Studio or Bundle run. Same language
          you’ll see in Account after you sign up.
        </p>
        <div className="pricing-grid">
          <div className="price-card">
            <div className="price-name">Free</div>
            <div className="price-amount">£0</div>
            <p className="price-blurb">
              {PLAN_LIMITS.free} generations / month · four formats per
              generation · brand voice included
            </p>
            <Link
              href={signedIn ? "/studio" : "/sign-up"}
              className="price-cta secondary"
            >
              {signedIn ? "Open Studio" : "Start free"}
            </Link>
          </div>

          {PAID_PLAN_CATALOG.filter((p) => p.id !== "pro_plus").map((plan) => (
            <div key={plan.id} className="price-card">
              <div className="price-name">{plan.title}</div>
              <div className="price-amount">{plan.priceLabel}</div>
              <p className="price-blurb">{plan.summary}</p>
              <Link
                href={signedIn ? "/account#plans" : "/sign-up"}
                className="price-cta secondary"
              >
                {signedIn ? "View in Account" : "Start free"}
              </Link>
            </div>
          ))}

          <div className="price-card featured">
            <div className="price-name">Pro Plus</div>
            <div className="price-amount">£{PLAN_PRICES.pro_plus}/mo</div>
            <p className="price-blurb">
              {PAID_PLAN_CATALOG.find((p) => p.id === "pro_plus")?.summary}
            </p>
            <Link
              href={signedIn ? "/account#plans" : "/sign-up"}
              className="price-cta primary"
            >
              {signedIn ? "View in Account" : "Start free"}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
