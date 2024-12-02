import {ArrowLeftIcon} from '@heroicons/react/24/solid'
import {Button} from '@mantine/core'
import type {LoaderArgs} from '@remix-run/node'
import {json, redirect} from '@remix-run/node'
import {Link, useLoaderData} from '@remix-run/react'
import {TailwindContainer} from '~/components/TailwindContainer'
import {db} from '~/db.server'

export const loader = async ({request, params}: LoaderArgs) => {
	const {testSlug} = params

	if (!testSlug) {
		return redirect('/faculty/tests')
	}

	const test = await db.test.findUnique({
		where: {
			slug: testSlug,
		},
		include: {
			questions: true,
			section: true,
			students: true,
		},
	})

	if (!test) {
		return redirect('/faculty/tests')
	}

	// find score of all the students who took the test
	const testStudents = await db.test.findMany({
		where: {
			slug: testSlug,
		},
		include: {
			students: {
				include: {
					enrollment: {
						include: {
							student: true,
						},
					},
					test: true,
				},
			},
		},
	})

	return json({testSlug, testStudents, test})
}

export default function Scores() {
	const {testStudents, test} = useLoaderData<typeof loader>()

	return (
		<>
			<TailwindContainer className="">
				<div className="px-8">
					<div className="sm:flex sm:flex-auto sm:items-center sm:justify-between">
						<div>
							<Button
								leftIcon={<ArrowLeftIcon className="h-4 w-4" />}
								variant="subtle"
								size="md"
								component={Link}
								to="/faculty/tests"
								mb={20}
								color="dark"
							>
								Back
							</Button>
							<div className="flex flex-col gap-4">
								<h1 className="text-3xl font-semibold text-gray-900">
									Quiz ({test.name})
								</h1>
								<div className="space-y-2">
									<p>{test.description}</p>
									<p>Max attempts: {test.maxAttempts}</p>
									<p>No of questions: {test.questions.length}</p>
								</div>
							</div>
						</div>
					</div>

					<div className="mt-8 flex flex-col">
						<div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
							<div className="grid grid-cols-4 px-8">
								{testStudents.length > 0 ? (
									<>
										<div className="overflow-hidden border-b border-gray-200 shadow sm:rounded-lg">
											<ul className="divide-y divide-gray-200">
												{testStudents.map(student => {
													const _testDetails = student.students.find(
														s => s.testId === test.id
													)
													return (
														<li key={student.id}>
															<div className="block bg-white hover:bg-gray-50">
																<div className="px-4 py-4 sm:px-6">
																	<div className="flex flex-col gap-2">
																		<div className="truncate font-medium text-indigo-600">
																			{_testDetails?.enrollment.student.name} (
																			{_testDetails?.enrollment.student.email})
																		</div>

																		<p>
																			Score: {_testDetails?.score}/
																			{test.questions.length}
																		</p>

																		<p>Attempts: {_testDetails?.attempts}</p>
																	</div>
																</div>
															</div>
														</li>
													)
												})}
											</ul>
										</div>
									</>
								) : (
									<div className="flex flex-col items-center justify-center rounded border border-dashed border-gray-400 py-12">
										<div className="text-sm font-medium italic text-gray-900">
											No student has taken this test yet.
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</TailwindContainer>
		</>
	)
}
