import {TestStatus} from '@prisma/client'
import type {ActionArgs} from '@remix-run/node'
import {json} from '@remix-run/node'
import {db} from '~/db.server'

export const action = async ({request}: ActionArgs) => {
	const formData = await request.formData()

	const answers = formData.getAll('answer')
	const testId = formData.get('testId')?.toString()
	const enrollmentTestId = formData.get('enrollmentTestId')?.toString()

	if (!testId || !enrollmentTestId) {
		return json({success: false})
	}

	const test = await db.test.findUnique({
		where: {
			id: testId,
		},
		include: {
			questions: true,
		},
	})

	if (!test) {
		return json({success: false})
	}

	const correctAnswers = test.questions.map(question => question.answer)

	const _answers = answers.map(answer => Number(answer))

	let correctAnswersCount = 0
	for (let i = 0; i < correctAnswers.length; i++) {
		if (correctAnswers[i] === _answers[i]) {
			correctAnswersCount++
		}
	}

	// Finally, update the enrollment test with the user's result
	await db.enrollmentTest.update({
		where: {
			id: enrollmentTestId,
		},
		data: {
			score: correctAnswersCount,
			attempts: {
				increment: 1,
			},
			status: TestStatus.ATTEMPTED,
		},
	})

	return json({success: true})
}
