import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { data: forms, error } = await supabase
    .from("forms")
    .select("id, title, status, updated_at")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Forms</h1>
        <p className="mt-4 text-red-600">
          Could not load your forms.
        </p>
      </div>
    );
  }

  const formsWithCounts = await Promise.all(
    (forms ?? []).map(async (form) => {
      const { count } = await supabase
        .from("responses")
        .select("*", { count: "exact", head: true })
        .eq("form_id", form.id);

      return {
        ...form,
        responseCount: count ?? 0,
      };
    })
  );

  return (
    <main className="mx-auto max-w-6xl p-6 text-gray-900">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-950">Your Forms</h1>
          <p className="mt-1 text-sm text-gray-800">
            Manage your digitized forms and collected responses.
          </p>
        </div>

        <Link
          href="/admin/upload"
          className="inline-flex rounded-md bg-black px-5 py-3 text-sm font-medium text-white hover:opacity-90"
        >
          Upload New Form
        </Link>
      </div>

      {formsWithCounts.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <h2 className="text-lg font-semibold text-gray-950">No forms yet</h2>

          <p className="mt-2 text-sm text-gray-800">
            Upload your first paper form or scanned PDF to get started.
          </p>

          <Link
            href="/admin/upload"
            className="mt-5 inline-flex rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Upload New Form
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm text-gray-900">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-semibold text-gray-900">Form</th>
                <th className="px-4 py-3 font-semibold text-gray-900">Status</th>
                <th className="px-4 py-3 font-semibold text-gray-900">Responses</th>
                <th className="px-4 py-3 font-semibold text-gray-900">Updated</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-900">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {formsWithCounts.map((form) => (
                <tr key={form.id} className="border-b last:border-b-0">
                  <td className="px-4 py-4 font-semibold text-gray-950">
                    {form.title || "Untitled Form"}
                  </td>

                  <td className="px-4 py-4">
                    <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-900 capitalize">
                      {form.status}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    {form.responseCount}
                  </td>

                  <td className="px-4 py-4 text-gray-800">
                    {form.updated_at
                      ? new Date(form.updated_at).toLocaleDateString()
                      : "—"}
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-3">
                      <Link
                        href={['draft', 'processing', 'failed'].includes(form.status)
                          ? `/admin/forms/${form.id}/status`
                          : `/admin/forms/${form.id}/review`}
                        className="font-semibold text-indigo-800 underline underline-offset-2 hover:text-indigo-950"
                      >
                        {['draft', 'processing', 'failed'].includes(form.status) ? 'View Status' : 'Review'}
                      </Link>

                      <Link
                        href={`/admin/forms/${form.id}/responses`}
                        className="font-semibold text-indigo-800 underline underline-offset-2 hover:text-indigo-950"
                      >
                        Responses
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
