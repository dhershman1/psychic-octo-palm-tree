import 'dotenv/config'
import express from 'express'
import axios from 'axios'

const app = express()
const port = process.env.PORT || 3000

function pageCount (responses) {
  if (responses > 0 && responses <= 20) {
    return 1
  }

  return Math.ceil(responses / 20)
}

function validate (op1, op2, operator) {
  switch (operator) {
    case 'equals':
      return op1 === op2
    case 'does_not_equal':
      return op1 != op2
    case 'greater_than':
      return op1 > op2
    case 'less_than':
      return op1 < op2
  }
}

app.get('/:formId/filteredResponses', async (req, res) => {
  try {
    const formId = req.params.formId
    const filters = req.query.filters ? JSON.parse(req.query.filters) : []
    const response = await axios.get(
      `https://api.fillout.com/v1/api/forms/${formId}/submissions`,
      {
        headers: {
          Authorization: `Bearer ${process.env.API_KEY}`
        },
        params: {
          filters: JSON.stringify(filters)
        }
      }
    )
    const { responses } = response.data

    const filteredResponses = responses.reduce((acc, resp) => {
      const { questions } = resp

      for (const q of questions) {
        let passesFilters = false

        const { id, value } = q

        for (const filter of filters) {
          passesFilters = true

          const isValid = validate(
            filter.value,
            value,
            filter.condition
          )

          if (id !== filter.id || !isValid) {
            passesFilters = false
          }
        }

        if (passesFilters) {
          acc.push(q)
        }
      }

      return acc
    }, [])

    const results = {
      responses: {
        questions: filteredResponses,
        totalResponses: filteredResponses.length,
        pageCount: pageCount(filteredResponses.length)
      }
    }

    res.json(results)
  } catch (err) {
    console.error("Error fetching filtered responses:", error.message)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.listen(port, () => {
  console.log(`Server Running on http://localhost:${port}`)
})
