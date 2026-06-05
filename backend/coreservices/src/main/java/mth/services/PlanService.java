package mth.services;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import mth.models.Plan;
import mth.repository.PlanRepository;

@Service
public class PlanService {

	@Autowired
	PlanRepository PR;

	public Object getAllPlans() {
		Map<String, Object> response = new HashMap<>();
		try {
			response.put("code", 200);
			response.put("plans", PR.findAll());
		} catch (Exception e) {
			response.put("code", 500);
			response.put("message", e.getMessage());
		}
		return response;
	}

	public Object getActivePlans() {
		Map<String, Object> response = new HashMap<>();
		try {
			response.put("code", 200);
			response.put("plans", PR.findByActiveTrueOrderByMonthlyPriceAsc());
		} catch (Exception e) {
			response.put("code", 500);
			response.put("message", e.getMessage());
		}
		return response;
	}

	public Object searchPlans(String term) {
		Map<String, Object> response = new HashMap<>();
		try {
			String query = term == null ? "" : term.trim();
			List<Plan> results = new ArrayList<>();

			if (query.isEmpty()) {
				results = PR.findByActiveTrueOrderByMonthlyPriceAsc();
			} else {
				results = PR.searchPlans(query);
			}

			response.put("code", 200);
			response.put("query", query);
			response.put("plans", results);
		} catch (Exception e) {
			response.put("code", 500);
			response.put("message", e.getMessage());
		}
		return response;
	}

	public Object getPlan(Long id) {
		Map<String, Object> response = new HashMap<>();
		try {
			Plan plan = PR.findById(id).orElse(null);
			if (plan == null) {
				response.put("code", 404);
				response.put("message", "Plan not found");
			} else {
				response.put("code", 200);
				response.put("plan", plan);
			}
		} catch (Exception e) {
			response.put("code", 500);
			response.put("message", e.getMessage());
		}
		return response;
	}

	public Object savePlan(Plan plan) {
		Map<String, Object> response = new HashMap<>();
		try {
			if (plan.getPlanName() == null || plan.getPlanName().trim().isEmpty()) {
				response.put("code", 400);
				response.put("message", "Plan name is required");
				return response;
			}

			Plan existing = PR.findByPlanNameIgnoreCase(plan.getPlanName().trim()).orElse(null);
			if (existing != null && (plan.getId() == null || !existing.getId().equals(plan.getId()))) {
				response.put("code", 409);
				response.put("message", "Plan name already exists");
				return response;
			}

			response.put("code", 200);
			response.put("plan", PR.save(plan));
		} catch (Exception e) {
			response.put("code", 500);
			response.put("message", e.getMessage());
		}
		return response;
	}
}