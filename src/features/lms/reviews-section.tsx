import { format } from "date-fns";
import { ReviewForm } from "@/features/lms/review-form";
import { Stars } from "@/features/lms/stars";
import type { Review } from "@/services/lms-engagement";

interface Props {
  courseId: string;
  reviews: Review[];
  average: number | null;
  count: number;
  /** Show the review form (owners of the course only). */
  canReview: boolean;
  myReview: Review | null;
}

/** Ratings summary, the learner's own form, and the visible reviews. */
export function ReviewsSection({ courseId, reviews, average, count, canReview, myReview }: Props) {
  if (!canReview && count === 0 && reviews.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="text-lg font-semibold">Reviews</h2>
        {count > 0 && average != null && (
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Stars value={average} /> {average.toFixed(1)} · {count} {count === 1 ? "review" : "reviews"}
          </span>
        )}
      </div>

      {canReview && <ReviewForm courseId={courseId} initial={myReview ? { rating: myReview.rating, body: myReview.body } : null} />}

      <ul className="space-y-4">
        {reviews.map((r) => (
          <li key={r.id} className="space-y-1 border-b pb-4 last:border-0">
            <div className="flex items-center gap-2">
              <Stars value={r.rating} />
              <span className="text-sm font-medium">{r.authorName}</span>
              <span className="text-xs text-muted-foreground">{format(r.createdAt, "MMM d, yyyy")}</span>
            </div>
            {r.body && <p className="whitespace-pre-line text-sm text-muted-foreground">{r.body}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
