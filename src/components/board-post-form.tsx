import Link from "next/link";
import {
  BOARD_AUTHOR_VISIBILITIES,
  BOARD_CATEGORIES,
  type BoardAuthorVisibility,
  type BoardCategory,
} from "@/lib/board";

type BoardPostFormValues = {
  authorVisibility: BoardAuthorVisibility;
  category: BoardCategory;
  title: string;
  body: string;
};

type BoardPostFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  cancelHref: string;
  submitLabel: string;
  error?: string;
  postId?: string;
  values?: BoardPostFormValues;
};

const EMPTY_VALUES: BoardPostFormValues = {
  authorVisibility: "anonymous",
  category: "free",
  title: "",
  body: "",
};

/** Shared create/edit form so board fields and validation stay in one place. */
export function BoardPostForm({
  action,
  cancelHref,
  submitLabel,
  error,
  postId,
  values = EMPTY_VALUES,
}: BoardPostFormProps) {
  return (
    <form action={action} className="board-write-form">
      {postId && <input type="hidden" name="postId" value={postId} />}

      <fieldset className="board-form-field board-identity-field">
        <legend>작성자 표시</legend>
        <div className="board-identity-options">
          {BOARD_AUTHOR_VISIBILITIES.map((visibility) => (
            <label className="board-identity-option" key={visibility.value}>
              <input
                type="radio"
                name="authorVisibility"
                value={visibility.value}
                defaultChecked={visibility.value === values.authorVisibility}
                required
              />
              <span>
                <strong>{visibility.label}</strong>
                <small>
                  {postId && visibility.value === "profile"
                    ? "선택하면 기존 익명 글에도 내 프로필이 공개돼요."
                    : visibility.description}
                </small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="board-form-field">
        <label htmlFor="board-category">카테고리</label>
        <select id="board-category" name="category" defaultValue={values.category} required>
          {BOARD_CATEGORIES.map((category) => (
            <option key={category.value} value={category.value}>{category.label}</option>
          ))}
        </select>
      </div>

      <div className="board-form-field">
        <label htmlFor="board-title">제목</label>
        <input
          id="board-title"
          name="title"
          type="text"
          required
          minLength={2}
          maxLength={120}
          defaultValue={values.title}
          placeholder="어떤 이야기를 나누고 싶나요?"
        />
      </div>

      <div className="board-form-field">
        <label htmlFor="board-body">내용</label>
        <textarea
          id="board-body"
          name="body"
          required
          maxLength={10000}
          defaultValue={values.body}
          placeholder="자유롭게 이야기를 나눠보세요."
        />
        <p>개인정보나 연락처는 꼭 필요한 경우에만 적어주세요.</p>
      </div>

      {error && <p className="board-write-error" role="alert">{error}</p>}

      <div className="board-write-actions">
        <Link className="button button-small button-secondary" href={cancelHref}>취소</Link>
        <button className="button button-small" type="submit">{submitLabel}</button>
      </div>
    </form>
  );
}
