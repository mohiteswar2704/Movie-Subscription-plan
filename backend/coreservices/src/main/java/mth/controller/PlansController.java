package mth.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import mth.models.Plan;
import mth.services.PlanService;

@RestController
@RequestMapping("/plans")
public class PlansController {

	@Autowired
	PlanService PS;

	@GetMapping
	public Object getAllPlans() {
		return PS.getActivePlans();
	}

	@GetMapping("/all")
	public Object getAllPlansIncludingInactive() {
		return PS.getAllPlans();
	}

	@GetMapping("/search")
	public Object searchPlans(@RequestParam(value = "q", required = false) String query) {
		return PS.searchPlans(query);
	}

	@GetMapping("/{id}")
	public Object getPlan(@PathVariable("id") Long id) {
		return PS.getPlan(id);
	}

	@PostMapping
	public Object savePlan(@RequestBody Plan plan) {
		return PS.savePlan(plan);
	}
}